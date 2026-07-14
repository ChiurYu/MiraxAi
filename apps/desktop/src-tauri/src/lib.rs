use std::{
    fs,
    io::{self, Read},
    path::{Path, PathBuf},
    process::Command,
    time::{SystemTime, UNIX_EPOCH},
};
use tauri_plugin_dialog::DialogExt;

#[cfg(unix)]
use std::{
    ffi::CString,
    os::{
        fd::{AsRawFd, FromRawFd},
        unix::ffi::OsStrExt,
    },
};

fn expand_tilde(path: &str) -> Result<String, String> {
    let trimmed = path.trim();
    if trimmed == "~" {
        return home_dir().map(|home| home);
    }
    if let Some(rest) = trimmed.strip_prefix("~/") {
        return home_dir().map(|home| format!("{}/{}", home, rest));
    }
    Ok(trimmed.to_string())
}

fn home_dir() -> Result<String, String> {
    std::env::var("HOME")
        .or_else(|_| std::env::var("USERPROFILE"))
        .map_err(|_| "not-configured: 无法解析用户主目录".to_string())
}

#[derive(serde::Deserialize, serde::Serialize)]
#[serde(rename_all = "camelCase")]
struct BaiLianErrorDiagnostic {
    code: Option<String>,
    message: Option<String>,
    request_id: Option<String>,
}

#[derive(serde::Deserialize)]
struct BaiLianErrorPayload {
    code: Option<String>,
    message: Option<String>,
    request_id: Option<String>,
}

#[derive(serde::Serialize)]
#[serde(rename_all = "camelCase")]
struct BaiLianJsonResponse {
    status: u16,
    body: String,
    diagnostic: Option<BaiLianErrorDiagnostic>,
}

fn safe_bailian_identifier(value: Option<String>) -> Option<String> {
    let value = value?.trim().to_string();
    if value.is_empty()
        || value.len() > 128
        || !value.chars().all(|character| {
            character.is_ascii_alphanumeric() || matches!(character, '-' | '_' | '.')
        })
    {
        return None;
    }
    Some(value)
}

fn safe_bailian_message(value: Option<String>) -> Option<String> {
    let value = value?.trim().to_string();
    if value.is_empty() {
        return None;
    }
    let lower = value.to_ascii_lowercase();
    if [
        "data:",
        "://",
        "/",
        "\\",
        "?",
        "&",
        "bearer",
        "sk-",
        "signature",
    ]
    .iter()
    .any(|marker| lower.contains(marker))
    {
        return Some("服务端诊断包含敏感内容，已隐藏".to_string());
    }
    Some(value.chars().take(240).collect())
}

fn parse_bailian_error_diagnostic(body: &str) -> Option<BaiLianErrorDiagnostic> {
    let payload: BaiLianErrorPayload = serde_json::from_str(body).ok()?;
    let diagnostic = BaiLianErrorDiagnostic {
        code: safe_bailian_identifier(payload.code),
        message: safe_bailian_message(payload.message),
        request_id: safe_bailian_identifier(payload.request_id),
    };
    if diagnostic.code.is_none() && diagnostic.message.is_none() && diagnostic.request_id.is_none()
    {
        None
    } else {
        Some(diagnostic)
    }
}

fn is_allowed_bailian_json_url(value: &str) -> bool {
    let Ok(url) = reqwest::Url::parse(value.trim()) else {
        return false;
    };
    let Some(host) = url.host_str() else {
        return false;
    };
    url.scheme() == "https"
        && host.ends_with(".cn-beijing.maas.aliyuncs.com")
        && url.path().starts_with("/api/v1/services/")
}

const MAX_BAILIAN_AUDIO_BYTES: u64 = 50 * 1024 * 1024;

fn is_allowed_bailian_audio_url(value: &str) -> bool {
    let Ok(url) = reqwest::Url::parse(value.trim()) else {
        return false;
    };
    let Some(host) = url.host_str() else {
        return false;
    };
    matches!(url.scheme(), "http" | "https")
        && url.username().is_empty()
        && url.password().is_none()
        && url.port().is_none()
        && host.starts_with("dashscope-result-")
        && host.contains(".oss-")
        && host.ends_with(".aliyuncs.com")
}

#[tauri::command]
async fn bailian_json_post(
    url: String,
    api_key: String,
    body: String,
) -> Result<BaiLianJsonResponse, String> {
    if api_key.trim().is_empty() || body.trim().is_empty() || !is_allowed_bailian_json_url(&url) {
        return Err("network: 百炼请求参数无效".to_string());
    }

    let response = reqwest::Client::new()
        .post(url)
        .bearer_auth(api_key)
        .header(reqwest::header::CONTENT_TYPE, "application/json")
        .body(body)
        .send()
        .await
        .map_err(|_| "network: 百炼请求无法连接".to_string())?;
    let status = response.status().as_u16();
    let response_body = response
        .text()
        .await
        .map_err(|_| "bad-response: 百炼响应读取失败".to_string())?;
    let diagnostic = if (200..300).contains(&status) {
        None
    } else {
        parse_bailian_error_diagnostic(&response_body)
    };
    let body = if (200..300).contains(&status) {
        response_body
    } else {
        String::new()
    };

    Ok(BaiLianJsonResponse {
        status,
        body,
        diagnostic,
    })
}

#[tauri::command]
async fn bailian_audio_get(url: String) -> Result<Vec<u8>, String> {
    if !is_allowed_bailian_audio_url(&url) {
        return Err("network: 百炼音频地址无效".to_string());
    }
    let client = reqwest::Client::builder()
        .redirect(reqwest::redirect::Policy::none())
        .build()
        .map_err(|_| "network: 百炼音频下载客户端初始化失败".to_string())?;
    let response = client
        .get(url)
        .send()
        .await
        .map_err(|_| "network: 百炼音频下载无法连接".to_string())?;
    if !response.status().is_success() {
        return Err("network: 百炼音频下载失败".to_string());
    }
    if response
        .content_length()
        .is_some_and(|size| size > MAX_BAILIAN_AUDIO_BYTES)
    {
        return Err("synthesis-failed: 百炼音频超过 50 MiB 限制".to_string());
    }
    let bytes = response
        .bytes()
        .await
        .map_err(|_| "network: 百炼音频读取失败".to_string())?;
    if bytes.len() as u64 > MAX_BAILIAN_AUDIO_BYTES {
        return Err("synthesis-failed: 百炼音频超过 50 MiB 限制".to_string());
    }
    Ok(bytes.to_vec())
}

fn resolve_ffprobe_path(ffmpeg_path: &str) -> Result<String, String> {
    let trimmed = ffmpeg_path.trim();
    if trimmed.is_empty() {
        return Ok("ffprobe".to_string());
    }

    let ffmpeg_path = PathBuf::from(trimmed);
    let file_name = ffmpeg_path
        .file_name()
        .map(|name| name.to_string_lossy().to_string())
        .unwrap_or_else(|| "ffmpeg".to_string());

    let ffprobe_name = if file_name.starts_with("ffmpeg") {
        file_name.replacen("ffmpeg", "ffprobe", 1)
    } else {
        "ffprobe".to_string()
    };

    if let Some(parent) = ffmpeg_path.parent() {
        let candidate = parent.join(&ffprobe_name);
        if candidate.is_file() {
            return Ok(candidate.to_string_lossy().to_string());
        }
    }

    Ok(ffprobe_name)
}

fn expand_tilde_and_reject_traversal(path: &str) -> Result<PathBuf, String> {
    let expanded = expand_tilde(path)?;
    let path = Path::new(&expanded);
    for component in path.components() {
        if matches!(component, std::path::Component::ParentDir) {
            return Err("synthesis-failed: 路径包含非法的父目录引用".to_string());
        }
    }
    Ok(path.to_path_buf())
}

fn canonicalize_root(root: &str) -> Result<PathBuf, String> {
    let path = expand_tilde_and_reject_traversal(root)?;
    if !path.is_absolute() {
        return Err("synthesis-failed: 输出根目录必须是绝对路径".to_string());
    }
    fs::create_dir_all(&path).map_err(|_| "synthesis-failed: 输出根目录创建失败".to_string())?;
    path.canonicalize()
        .map_err(|_| "synthesis-failed: 输出根目录无效".to_string())
}

fn resolve_within_root(target: &str, root: &str, create_parent: bool) -> Result<PathBuf, String> {
    let target = expand_tilde_and_reject_traversal(target)?;
    let raw_root = expand_tilde_and_reject_traversal(root)?;

    if !target.is_absolute() {
        return Err("synthesis-failed: 目标路径必须是绝对路径".to_string());
    }
    if !raw_root.is_absolute() {
        return Err("synthesis-failed: 输出根目录必须是绝对路径".to_string());
    }

    if !target.starts_with(&raw_root) {
        return Err("synthesis-failed: 目标路径不在允许的输出目录内".to_string());
    }

    let canonical_root = canonicalize_root(root)?;

    let file_name = target
        .file_name()
        .filter(|name| !name.is_empty() && *name != ".")
        .ok_or_else(|| "synthesis-failed: 目标路径必须是文件".to_string())?;

    let parent = target
        .parent()
        .ok_or_else(|| "synthesis-failed: 目标路径缺少父目录".to_string())?;
    if create_parent {
        fs::create_dir_all(parent).map_err(|_| "synthesis-failed: 输出目录创建失败".to_string())?;
    }

    let canonical_parent = parent
        .canonicalize()
        .map_err(|_| "synthesis-failed: 输出目录无效".to_string())?;
    if !canonical_parent.starts_with(&canonical_root) {
        return Err("synthesis-failed: 目标路径不在允许的输出目录内".to_string());
    }

    let canonical_target = canonical_parent.join(file_name);
    if canonical_target == canonical_root || !canonical_target.starts_with(&canonical_root) {
        return Err("synthesis-failed: 目标路径不能是目录".to_string());
    }

    if canonical_target.is_dir() {
        return Err("synthesis-failed: 目标路径不能是目录".to_string());
    }

    if canonical_target.exists() {
        let resolved = canonical_target
            .canonicalize()
            .map_err(|_| "synthesis-failed: 目标文件解析失败".to_string())?;
        if !resolved.starts_with(&canonical_root) {
            return Err("synthesis-failed: 目标路径不在允许的输出目录内".to_string());
        }
    }

    Ok(canonical_target)
}

fn ensure_within_root(target: &str, root: &str) -> Result<PathBuf, String> {
    resolve_within_root(target, root, true)
}

const MAX_VOICE_SAMPLE_BYTES: u64 = 25 * 1024 * 1024;

#[derive(Debug, serde::Serialize)]
#[serde(rename_all = "camelCase")]
struct ImportedVoiceSample {
    relative_path: String,
    file_name: String,
    mime_type: String,
    size_bytes: u64,
}

fn voice_sample_error(message: &str) -> String {
    format!("voice-sample-failed: {message}")
}

fn managed_sample_mime(source: &Path) -> Result<&'static str, String> {
    match source
        .extension()
        .and_then(|extension| extension.to_str())
        .map(|extension| extension.to_ascii_lowercase())
        .as_deref()
    {
        Some("wav") => Ok("audio/wav"),
        Some("mp3") => Ok("audio/mpeg"),
        Some("m4a") => Ok("audio/mp4"),
        Some("flac") => Ok("audio/flac"),
        Some("aac") => Ok("audio/aac"),
        _ => Err(voice_sample_error("不支持的声音样本格式")),
    }
}

fn validate_managed_sample_relative_path(relative_path: &str) -> Result<PathBuf, String> {
    let relative = Path::new(relative_path.trim());
    if relative_path.trim().is_empty()
        || relative.is_absolute()
        || relative
            .components()
            .any(|component| !matches!(component, std::path::Component::Normal(_)))
    {
        return Err(voice_sample_error("托管样本相对路径无效"));
    }
    Ok(relative.to_path_buf())
}

#[cfg(unix)]
fn voice_sample_c_string(path: &Path) -> Result<CString, String> {
    CString::new(path.as_os_str().as_bytes()).map_err(|_| voice_sample_error("托管样本路径无效"))
}

#[cfg(unix)]
fn open_directory_no_follow(path: &Path) -> Result<fs::File, String> {
    let path = voice_sample_c_string(path)?;
    let fd = unsafe {
        libc::open(
            path.as_ptr(),
            libc::O_RDONLY | libc::O_DIRECTORY | libc::O_NOFOLLOW | libc::O_CLOEXEC,
        )
    };
    if fd < 0 {
        return Err(voice_sample_error("托管样本根目录无效"));
    }
    Ok(unsafe { fs::File::from_raw_fd(fd) })
}

#[cfg(unix)]
fn open_managed_parent_no_follow(
    canonical_root: &Path,
    relative_path: &Path,
    create: bool,
) -> Result<fs::File, String> {
    let mut parent = open_directory_no_follow(canonical_root)?;
    let Some(relative_parent) = relative_path.parent() else {
        return Ok(parent);
    };

    for component in relative_parent.components() {
        let std::path::Component::Normal(name) = component else {
            return Err(voice_sample_error("托管样本相对路径无效"));
        };
        let name = CString::new(name.as_bytes())
            .map_err(|_| voice_sample_error("托管样本相对路径无效"))?;
        if create {
            let result = unsafe { libc::mkdirat(parent.as_raw_fd(), name.as_ptr(), 0o700) };
            if result != 0 && io::Error::last_os_error().kind() != io::ErrorKind::AlreadyExists {
                return Err(voice_sample_error("托管样本目录创建失败"));
            }
        }
        let fd = unsafe {
            libc::openat(
                parent.as_raw_fd(),
                name.as_ptr(),
                libc::O_RDONLY | libc::O_DIRECTORY | libc::O_NOFOLLOW | libc::O_CLOEXEC,
            )
        };
        if fd < 0 {
            return Err(voice_sample_error("托管样本目标路径无效"));
        }
        parent = unsafe { fs::File::from_raw_fd(fd) };
    }

    Ok(parent)
}

#[cfg(unix)]
fn create_voice_sample_temp_file(
    parent: &fs::File,
    file_name: &str,
) -> Result<(CString, fs::File), String> {
    let timestamp = SystemTime::now()
        .duration_since(UNIX_EPOCH)
        .map_err(|_| voice_sample_error("无法创建托管样本临时文件"))?
        .as_nanos();

    for attempt in 0..16 {
        let temp_name = CString::new(format!(".{file_name}.{timestamp}.{attempt}.partial"))
            .map_err(|_| voice_sample_error("无法创建托管样本临时文件"))?;
        let fd = unsafe {
            libc::openat(
                parent.as_raw_fd(),
                temp_name.as_ptr(),
                libc::O_WRONLY | libc::O_CREAT | libc::O_EXCL | libc::O_NOFOLLOW | libc::O_CLOEXEC,
                0o600,
            )
        };
        if fd >= 0 {
            return Ok((temp_name, unsafe { fs::File::from_raw_fd(fd) }));
        }
        if io::Error::last_os_error().kind() != io::ErrorKind::AlreadyExists {
            return Err(voice_sample_error("无法创建托管样本临时文件"));
        }
    }

    Err(voice_sample_error("无法创建托管样本临时文件"))
}

#[cfg(unix)]
fn remove_temp_voice_sample(parent: &fs::File, temp_name: &CString) -> Result<(), String> {
    if unsafe { libc::unlinkat(parent.as_raw_fd(), temp_name.as_ptr(), 0) } != 0 {
        return Err(voice_sample_error("托管样本临时文件清理失败"));
    }
    Ok(())
}

#[cfg(unix)]
fn commit_voice_sample(
    parent: &fs::File,
    temp_name: &CString,
    file_name: &CString,
) -> Result<(), String> {
    #[cfg(target_os = "macos")]
    let renamed = unsafe {
        unsafe extern "C" {
            fn renameatx_np(
                fromfd: libc::c_int,
                from: *const libc::c_char,
                tofd: libc::c_int,
                to: *const libc::c_char,
                flags: libc::c_uint,
            ) -> libc::c_int;
        }
        renameatx_np(
            parent.as_raw_fd(),
            temp_name.as_ptr(),
            parent.as_raw_fd(),
            file_name.as_ptr(),
            0x0000_0004, // RENAME_EXCL
        )
    };
    #[cfg(target_os = "linux")]
    let renamed = unsafe {
        libc::syscall(
            libc::SYS_renameat2,
            parent.as_raw_fd(),
            temp_name.as_ptr(),
            parent.as_raw_fd(),
            file_name.as_ptr(),
            libc::RENAME_NOREPLACE,
        ) as libc::c_int
    };
    #[cfg(not(any(target_os = "macos", target_os = "linux")))]
    let renamed = -1;

    if renamed != 0 {
        return Err(voice_sample_error("托管样本目标已存在"));
    }
    Ok(())
}

fn open_regular_voice_sample(path: &Path, missing_message: &str) -> Result<fs::File, String> {
    let metadata = fs::symlink_metadata(path).map_err(|_| voice_sample_error(missing_message))?;
    if metadata.file_type().is_symlink() || !metadata.is_file() {
        return Err(voice_sample_error("声音样本必须是普通文件"));
    }
    if metadata.len() > MAX_VOICE_SAMPLE_BYTES {
        return Err(voice_sample_error("声音样本超过 25 MiB 限制"));
    }

    let mut options = fs::OpenOptions::new();
    options.read(true);
    #[cfg(unix)]
    {
        use std::os::unix::fs::OpenOptionsExt;
        options.custom_flags(libc::O_NOFOLLOW);
    }
    let file = options
        .open(path)
        .map_err(|_| voice_sample_error(missing_message))?;
    let opened_metadata = file
        .metadata()
        .map_err(|_| voice_sample_error(missing_message))?;
    if !opened_metadata.is_file() || opened_metadata.len() > MAX_VOICE_SAMPLE_BYTES {
        return Err(voice_sample_error("声音样本超过 25 MiB 限制"));
    }

    Ok(file)
}

#[cfg(unix)]
#[tauri::command]
fn import_voice_sample(
    source_path: String,
    allowed_root: String,
    relative_path: String,
) -> Result<ImportedVoiceSample, String> {
    if source_path.trim().is_empty() || allowed_root.trim().is_empty() {
        return Err(voice_sample_error("声音样本参数不完整"));
    }

    let source = PathBuf::from(
        expand_tilde(&source_path).map_err(|_| voice_sample_error("声音样本来源无效"))?,
    );
    if !source.is_absolute() {
        return Err(voice_sample_error("声音样本来源无效"));
    }

    let mime_type = managed_sample_mime(&source)?;
    let relative = validate_managed_sample_relative_path(&relative_path)?;
    let file_name = relative
        .file_name()
        .and_then(|name| name.to_str())
        .filter(|name| !name.is_empty())
        .ok_or_else(|| voice_sample_error("托管样本文件名无效"))?
        .to_string();
    let canonical_root =
        canonicalize_root(&allowed_root).map_err(|_| voice_sample_error("托管样本根目录无效"))?;
    let parent = open_managed_parent_no_follow(&canonical_root, &relative, true)?;
    let file_name_c =
        CString::new(file_name.as_bytes()).map_err(|_| voice_sample_error("托管样本文件名无效"))?;
    let (temp_name, mut temp_file) = create_voice_sample_temp_file(&parent, &file_name)?;

    let copy_result = (|| -> Result<u64, String> {
        let mut source_file = open_regular_voice_sample(&source, "无法读取声音样本来源")?;
        let copied = io::copy(
            &mut source_file.by_ref().take(MAX_VOICE_SAMPLE_BYTES + 1),
            &mut temp_file,
        )
        .map_err(|_| voice_sample_error("声音样本复制失败"))?;
        if copied > MAX_VOICE_SAMPLE_BYTES {
            return Err(voice_sample_error("声音样本超过 25 MiB 限制"));
        }
        temp_file
            .sync_all()
            .map_err(|_| voice_sample_error("声音样本复制失败"))?;
        Ok(copied)
    })();

    drop(temp_file);
    let copy_result = copy_result.and_then(|copied| {
        commit_voice_sample(&parent, &temp_name, &file_name_c)?;
        Ok(copied)
    });

    if let Err(error) = copy_result {
        if let Err(cleanup_error) = remove_temp_voice_sample(&parent, &temp_name) {
            return Err(cleanup_error);
        }
        return Err(error);
    }
    let size_bytes = copy_result.unwrap();

    Ok(ImportedVoiceSample {
        relative_path,
        file_name,
        mime_type: mime_type.to_string(),
        size_bytes,
    })
}

#[cfg(not(unix))]
#[tauri::command]
fn import_voice_sample(
    _source_path: String,
    _allowed_root: String,
    _relative_path: String,
) -> Result<ImportedVoiceSample, String> {
    Err(voice_sample_error("当前平台不支持安全托管样本操作"))
}

#[cfg(unix)]
#[tauri::command]
fn read_managed_voice_sample(path: String, allowed_root: String) -> Result<Vec<u8>, String> {
    if path.trim().is_empty() || allowed_root.trim().is_empty() {
        return Err(voice_sample_error("托管样本参数不完整"));
    }

    let target = resolve_within_root(&path, &allowed_root, false)
        .map_err(|_| voice_sample_error("托管样本目标路径无效"))?;
    let canonical_root =
        canonicalize_root(&allowed_root).map_err(|_| voice_sample_error("托管样本根目录无效"))?;
    let relative = target
        .strip_prefix(&canonical_root)
        .map_err(|_| voice_sample_error("托管样本目标路径无效"))?;
    let file_name = relative
        .file_name()
        .ok_or_else(|| voice_sample_error("托管样本目标路径无效"))?;
    let file_name = CString::new(file_name.as_bytes())
        .map_err(|_| voice_sample_error("托管样本目标路径无效"))?;
    let parent = open_managed_parent_no_follow(&canonical_root, relative, false)?;
    let fd = unsafe {
        libc::openat(
            parent.as_raw_fd(),
            file_name.as_ptr(),
            libc::O_RDONLY | libc::O_NOFOLLOW | libc::O_CLOEXEC,
        )
    };
    if fd < 0 {
        return Err(voice_sample_error("托管样本不存在"));
    }
    let mut file = unsafe { fs::File::from_raw_fd(fd) };
    let metadata = file
        .metadata()
        .map_err(|_| voice_sample_error("托管样本不存在"))?;
    if !metadata.is_file() {
        return Err(voice_sample_error("托管样本必须是普通文件"));
    }
    let mut bytes = Vec::new();
    file.by_ref()
        .take(MAX_VOICE_SAMPLE_BYTES + 1)
        .read_to_end(&mut bytes)
        .map_err(|_| voice_sample_error("托管样本读取失败"))?;
    if bytes.len() as u64 > MAX_VOICE_SAMPLE_BYTES {
        return Err(voice_sample_error("声音样本超过 25 MiB 限制"));
    }
    Ok(bytes)
}

#[cfg(not(unix))]
#[tauri::command]
fn read_managed_voice_sample(_path: String, _allowed_root: String) -> Result<Vec<u8>, String> {
    Err(voice_sample_error("当前平台不支持安全托管样本操作"))
}

#[cfg(unix)]
#[tauri::command]
fn delete_managed_voice_sample(path: String, allowed_root: String) -> Result<(), String> {
    if path.trim().is_empty() || allowed_root.trim().is_empty() {
        return Err(voice_sample_error("托管样本参数不完整"));
    }

    let target = resolve_within_root(&path, &allowed_root, false)
        .map_err(|_| voice_sample_error("托管样本目标路径无效"))?;
    let canonical_root =
        canonicalize_root(&allowed_root).map_err(|_| voice_sample_error("托管样本根目录无效"))?;
    let relative = target
        .strip_prefix(&canonical_root)
        .map_err(|_| voice_sample_error("托管样本目标路径无效"))?;
    let file_name = relative
        .file_name()
        .ok_or_else(|| voice_sample_error("托管样本目标路径无效"))?;
    let file_name = CString::new(file_name.as_bytes())
        .map_err(|_| voice_sample_error("托管样本目标路径无效"))?;
    let parent = open_managed_parent_no_follow(&canonical_root, relative, false)?;
    let mut metadata = unsafe { std::mem::zeroed::<libc::stat>() };
    let stat_result = unsafe {
        libc::fstatat(
            parent.as_raw_fd(),
            file_name.as_ptr(),
            &mut metadata,
            libc::AT_SYMLINK_NOFOLLOW,
        )
    };
    if stat_result != 0 {
        return Err(voice_sample_error("托管样本不存在"));
    }
    if metadata.st_mode & libc::S_IFMT != libc::S_IFREG {
        return Err(voice_sample_error("托管样本必须是普通文件"));
    }
    if unsafe { libc::unlinkat(parent.as_raw_fd(), file_name.as_ptr(), 0) } != 0 {
        return Err(voice_sample_error("托管样本删除失败"));
    }
    Ok(())
}

#[cfg(not(unix))]
#[tauri::command]
fn delete_managed_voice_sample(_path: String, _allowed_root: String) -> Result<(), String> {
    Err(voice_sample_error("当前平台不支持安全托管样本操作"))
}

#[tauri::command]
fn render_compose(
    ffmpeg_path: String,
    avatar_video_path: String,
    audio_path: String,
    subtitle_text: String,
    cover_text: String,
    video_path: String,
    cover_path: String,
    subtitle_path: String,
) -> Result<(), String> {
    if ffmpeg_path.trim().is_empty()
        || avatar_video_path.trim().is_empty()
        || audio_path.trim().is_empty()
        || video_path.trim().is_empty()
        || cover_path.trim().is_empty()
        || subtitle_path.trim().is_empty()
    {
        return Err("FFmpeg 合成参数不完整".into());
    }

    create_parent_dir(&video_path)?;
    create_parent_dir(&cover_path)?;
    create_parent_dir(&subtitle_path)?;

    let subtitle_body = if subtitle_text.trim().is_empty() {
        cover_text.trim()
    } else {
        subtitle_text.trim()
    };
    fs::write(
        &subtitle_path,
        format!("1\n00:00:00,000 --> 99:59:59,000\n{}\n", subtitle_body),
    )
    .map_err(|_| "字幕文件写入失败".to_string())?;

    run_ffmpeg(
        &ffmpeg_path,
        &[
            "-y",
            "-i",
            &avatar_video_path,
            "-i",
            &audio_path,
            "-vf",
            &format!("scale=1080:1920:force_original_aspect_ratio=decrease,pad=1080:1920:(ow-iw)/2:(oh-ih)/2,subtitles={}", subtitle_path),
            "-map",
            "0:v:0",
            "-map",
            "1:a:0",
            "-c:v",
            "libx264",
            "-c:a",
            "aac",
            "-shortest",
            &video_path,
        ],
    )?;

    run_ffmpeg(
        &ffmpeg_path,
        &["-y", "-i", &video_path, "-frames:v", "1", &cover_path],
    )?;

    Ok(())
}

fn create_parent_dir(path: &str) -> Result<(), String> {
    if let Some(parent) = Path::new(path).parent() {
        fs::create_dir_all(parent).map_err(|_| "输出目录创建失败".to_string())?;
    }
    Ok(())
}

fn run_ffmpeg(program: &str, args: &[&str]) -> Result<(), String> {
    let status = Command::new(program)
        .args(args)
        .status()
        .map_err(|_| "FFmpeg 启动失败".to_string())?;

    if status.success() {
        Ok(())
    } else {
        Err("FFmpeg 执行失败".to_string())
    }
}

#[tauri::command]
fn probe_ffmpeg(ffmpeg_path: String) -> Result<bool, String> {
    let trimmed = ffmpeg_path.trim();
    if trimmed.is_empty() {
        return Ok(false);
    }

    let status = Command::new(trimmed)
        .args(["-version"])
        .status()
        .map_err(|_| "FFmpeg 探测失败".to_string())?;

    Ok(status.success())
}

#[tauri::command]
fn extract_audio(
    ffmpeg_path: String,
    input_path: String,
    output_path: String,
) -> Result<(), String> {
    if ffmpeg_path.trim().is_empty()
        || input_path.trim().is_empty()
        || output_path.trim().is_empty()
    {
        return Err("FFmpeg 音频抽取参数不完整".into());
    }

    create_parent_dir(&output_path)?;

    run_ffmpeg(
        &ffmpeg_path,
        &[
            "-y",
            "-i",
            &input_path,
            "-vn",
            "-acodec",
            "pcm_s16le",
            "-ar",
            "16000",
            "-ac",
            "1",
            &output_path,
        ],
    )?;

    Ok(())
}

#[tauri::command]
fn detect_ffmpeg() -> Result<Option<String>, String> {
    let path_var = match std::env::var_os("PATH") {
        Some(v) => v,
        None => return Ok(None),
    };

    for dir in std::env::split_paths(&path_var) {
        let candidate = dir.join("ffmpeg");
        if candidate.is_file() {
            let candidate_str = candidate.to_string_lossy().to_string();
            let status = Command::new(&candidate_str)
                .args(["-version"])
                .status()
                .map_err(|_| "FFmpeg 探测失败".to_string())?;
            if status.success() {
                return Ok(Some(candidate_str));
            }
        }
    }

    Ok(None)
}

#[tauri::command]
fn probe_local_whisper(python_path: String) -> Result<bool, String> {
    let expanded = expand_tilde(&python_path)?;
    let trimmed = expanded.trim();
    if trimmed.is_empty() {
        return Err("not-configured: Python 解释器路径未配置".into());
    }
    if !Path::new(trimmed).is_file() {
        return Err("not-configured: Python 解释器不存在".into());
    }

    let output = Command::new(trimmed)
        .args(["-c", "import faster_whisper; print('ok')"])
        .output()
        .map_err(|_| "not-configured: 无法启动 Python 解释器".to_string())?;

    if output.status.success() {
        return Ok(true);
    }

    let stderr = String::from_utf8_lossy(&output.stderr).to_lowercase();
    if stderr.contains("modulenotfounderror") || stderr.contains("no module named") {
        return Err("not-configured: faster_whisper 未安装".into());
    }
    Err("not-configured: Python 环境检测失败".into())
}

#[tauri::command]
fn run_local_whisper(
    python_path: String,
    model: String,
    device: String,
    compute_type: String,
    audio_path: String,
    language: Option<String>,
) -> Result<String, String> {
    let expanded_python = expand_tilde(&python_path)?;
    let trimmed_python = expanded_python.trim();
    if trimmed_python.is_empty() {
        return Err("not-configured: Python 解释器路径未配置".into());
    }
    if !Path::new(trimmed_python).is_file() {
        return Err("not-configured: Python 解释器不存在".into());
    }

    let trimmed_audio = audio_path.trim();
    if trimmed_audio.is_empty() {
        return Err("transcribe-failed: 音频路径为空".into());
    }

    let script = r#"
import json, sys
if len(sys.argv) < 5:
    raise ValueError("missing arguments")
model, device, compute_type, audio_path = sys.argv[1:5]
language = sys.argv[5] if len(sys.argv) > 5 else None
from faster_whisper import WhisperModel
model = WhisperModel(model, device=device, compute_type=compute_type)
options = {"language": language} if language else {}
if language and language.startswith("zh"):
    options["initial_prompt"] = "以下是普通话简体中文转写，请使用简体中文。"
segments, info = model.transcribe(audio_path, **options)
segment_list = list(segments)
result = {
    "text": " ".join(s.text for s in segment_list),
    "segments": [{"start": s.start, "end": s.end, "text": s.text} for s in segment_list],
}
print(json.dumps(result, ensure_ascii=False))
"#;

    let output = Command::new(trimmed_python)
        .arg("-c")
        .arg(script)
        .arg(&model)
        .arg(&device)
        .arg(&compute_type)
        .arg(&audio_path)
        .args(language.as_ref().map(|l| [l.as_str()]).unwrap_or_default())
        .output()
        .map_err(|_| "not-configured: 无法启动 Python 解释器".to_string())?;

    if output.status.success() {
        return String::from_utf8(output.stdout)
            .map_err(|_| "transcribe-failed: 本地 Whisper 输出编码异常".to_string());
    }

    let stderr = String::from_utf8_lossy(&output.stderr).to_lowercase();
    if stderr.contains("modulenotfounderror") || stderr.contains("no module named") {
        return Err("not-configured: faster_whisper 未安装".into());
    }
    if stderr.contains("filenotfounderror") || stderr.contains("no such file") {
        return Err("transcribe-failed: 音频文件不存在".into());
    }
    Err("transcribe-failed: 本地 Whisper 执行失败".into())
}

#[tauri::command]
fn write_binary_file(path: String, data: Vec<u8>, allowed_root: String) -> Result<(), String> {
    if path.trim().is_empty() {
        return Err("synthesis-failed: 目标路径为空".into());
    }
    if allowed_root.trim().is_empty() {
        return Err("synthesis-failed: 输出根目录为空".into());
    }

    let target = ensure_within_root(&path, &allowed_root)?;

    fs::write(&target, data).map_err(|_| "synthesis-failed: 音频文件写入失败".to_string())
}

#[tauri::command]
fn read_binary_file(path: String, allowed_root: String) -> Result<Vec<u8>, String> {
    if path.trim().is_empty() {
        return Err("synthesis-failed: 音频路径为空".into());
    }
    if allowed_root.trim().is_empty() {
        return Err("synthesis-failed: 输出根目录为空".into());
    }

    let target = resolve_within_root(&path, &allowed_root, false)?;
    if !target.is_file() {
        return Err("synthesis-failed: 音频文件不存在".into());
    }

    fs::read(&target).map_err(|_| "synthesis-failed: 音频文件读取失败".to_string())
}

fn existing_audio_file(path: &str, allowed_root: &str) -> Result<PathBuf, String> {
    if path.trim().is_empty() {
        return Err("synthesis-failed: 音频路径为空".into());
    }
    if allowed_root.trim().is_empty() {
        return Err("synthesis-failed: 输出根目录为空".into());
    }

    let target = resolve_within_root(path, allowed_root, false)?;
    if !target.is_file() {
        return Err("synthesis-failed: 音频文件不存在".into());
    }
    Ok(target)
}

#[tauri::command]
async fn export_audio_file(
    app: tauri::AppHandle,
    path: String,
    allowed_root: String,
) -> Result<bool, String> {
    let source = existing_audio_file(&path, &allowed_root)?;
    let file_name = source
        .file_name()
        .and_then(|value| value.to_str())
        .unwrap_or("speech.wav");
    let extension = source
        .extension()
        .and_then(|value| value.to_str())
        .filter(|value| matches!(*value, "mp3" | "wav"))
        .unwrap_or("wav");
    let destination = app
        .dialog()
        .file()
        .set_title("保存合成音频")
        .set_file_name(file_name)
        .add_filter("音频", &[extension])
        .blocking_save_file();
    let Some(destination) = destination else {
        return Ok(false);
    };
    let destination = destination
        .into_path()
        .map_err(|_| "synthesis-failed: 保存路径无效".to_string())?;
    if destination != source {
        fs::copy(source, destination)
            .map_err(|_| "synthesis-failed: 音频文件保存失败".to_string())?;
    }
    Ok(true)
}

#[tauri::command]
fn reveal_audio_file(path: String, allowed_root: String) -> Result<(), String> {
    let target = existing_audio_file(&path, &allowed_root)?;

    #[cfg(target_os = "macos")]
    let status = Command::new("open").arg("-R").arg(&target).status();
    #[cfg(target_os = "windows")]
    let status = Command::new("explorer")
        .arg(format!("/select,{}", target.display()))
        .status();
    #[cfg(all(unix, not(target_os = "macos")))]
    let status = Command::new("xdg-open")
        .arg(target.parent().unwrap_or(&target))
        .status();

    match status {
        Ok(status) if status.success() => Ok(()),
        _ => Err("synthesis-failed: 无法打开音频所在文件夹".into()),
    }
}

#[tauri::command]
fn check_audio_file(path: String, allowed_root: String) -> Result<bool, String> {
    if path.trim().is_empty() {
        return Ok(false);
    }
    if allowed_root.trim().is_empty() {
        return Ok(false);
    }

    match resolve_within_root(&path, &allowed_root, false) {
        Ok(target) => Ok(target.is_file()),
        Err(_) => Ok(false),
    }
}

#[tauri::command]
fn probe_audio_duration(
    path: String,
    allowed_root: String,
    ffmpeg_path: String,
) -> Result<f64, String> {
    if path.trim().is_empty() {
        return Err("synthesis-failed: 音频路径为空".into());
    }
    if allowed_root.trim().is_empty() {
        return Err("synthesis-failed: 输出根目录为空".into());
    }

    let target = ensure_within_root(&path, &allowed_root)?;
    if !target.is_file() {
        return Err("synthesis-failed: 音频文件不存在".into());
    }

    let ffprobe = resolve_ffprobe_path(&ffmpeg_path)?;

    let output = Command::new(ffprobe)
        .args([
            "-v",
            "error",
            "-show_entries",
            "format=duration",
            "-of",
            "csv=p=0",
            target.to_string_lossy().as_ref(),
        ])
        .output()
        .map_err(|_| "synthesis-failed: ffprobe 启动失败".to_string())?;

    if !output.status.success() {
        return Err("synthesis-failed: ffprobe 探测失败".to_string());
    }

    let stdout = String::from_utf8_lossy(&output.stdout);
    stdout
        .trim()
        .parse::<f64>()
        .map_err(|_| "synthesis-failed: ffprobe 返回时长格式无效".to_string())
}

#[cfg(test)]
mod tests {
    use super::*;
    use std::fs;

    #[test]
    fn ensure_within_root_accepts_file_inside_root() {
        let tmp = tempfile::tempdir().unwrap();
        let root = tmp.path().join("audio");
        let target = root.join("project-1/speech/speech.mp3");

        let result = ensure_within_root(
            target.to_string_lossy().as_ref(),
            root.to_string_lossy().as_ref(),
        );

        assert!(result.is_ok());
        let resolved = result.unwrap();
        assert!(resolved.starts_with(root.canonicalize().unwrap()));
    }

    #[test]
    fn ensure_within_root_rejects_parent_dir_traversal() {
        let tmp = tempfile::tempdir().unwrap();
        let root = tmp.path().join("audio");
        let target = root.join("project-1/../outside.mp3");

        let result = ensure_within_root(
            target.to_string_lossy().as_ref(),
            root.to_string_lossy().as_ref(),
        );

        assert!(result.is_err());
        assert!(result.unwrap_err().contains("父目录引用"));
    }

    #[test]
    fn ensure_within_root_rejects_absolute_path_outside_root() {
        let tmp = tempfile::tempdir().unwrap();
        let root = tmp.path().join("audio");
        let outside = tmp.path().join("outside.mp3");

        let result = ensure_within_root(
            outside.to_string_lossy().as_ref(),
            root.to_string_lossy().as_ref(),
        );

        assert!(result.is_err());
        assert!(result.unwrap_err().contains("不在允许的输出目录内"));
    }

    #[test]
    fn ensure_within_root_rejects_target_equal_to_root() {
        let tmp = tempfile::tempdir().unwrap();
        let root = tmp.path().join("audio");

        let result = ensure_within_root(
            root.to_string_lossy().as_ref(),
            root.to_string_lossy().as_ref(),
        );

        assert!(result.is_err());
    }

    #[test]
    fn ensure_within_root_rejects_root_with_parent_dir_reference() {
        let tmp = tempfile::tempdir().unwrap();
        let root = tmp.path().join("audio/../other");

        let result = ensure_within_root(
            root.join("speech.mp3").to_string_lossy().as_ref(),
            root.to_string_lossy().as_ref(),
        );

        assert!(result.is_err());
        assert!(result.unwrap_err().contains("父目录引用"));
    }

    #[test]
    fn ensure_within_root_blocks_symlink_escape() {
        let tmp = tempfile::tempdir().unwrap();
        let root = tmp.path().join("audio");
        let outside = tmp.path().join("outside");
        fs::create_dir_all(&outside).unwrap();
        fs::create_dir_all(root.join("project-1")).unwrap();

        let symlink = root.join("project-1/speech");
        #[cfg(unix)]
        std::os::unix::fs::symlink(&outside, &symlink).unwrap();
        #[cfg(windows)]
        std::os::windows::fs::symlink_dir(&outside, &symlink).unwrap();

        let target = symlink.join("speech.mp3");
        let result = ensure_within_root(
            target.to_string_lossy().as_ref(),
            root.to_string_lossy().as_ref(),
        );

        assert!(result.is_err());
        assert!(result.unwrap_err().contains("不在允许的输出目录内"));
    }

    #[test]
    fn ensure_within_root_does_not_create_parent_outside_root() {
        let tmp = tempfile::tempdir().unwrap();
        let root = tmp.path().join("audio");
        let outside_parent = tmp.path().join("outside/subdir");
        let target = outside_parent.join("file.mp3");

        let result = ensure_within_root(
            target.to_string_lossy().as_ref(),
            root.to_string_lossy().as_ref(),
        );

        assert!(result.is_err());
        assert!(!outside_parent.exists(), "root 外的父目录不应被创建");
    }

    #[test]
    fn read_binary_file_returns_contents_within_root() {
        let tmp = tempfile::tempdir().unwrap();
        let root = tmp.path().join("audio");
        let target = root.join("project-1/speech/speech.mp3");
        fs::create_dir_all(target.parent().unwrap()).unwrap();
        fs::write(&target, b"fake-mp3-bytes").unwrap();

        let result = read_binary_file(
            target.to_string_lossy().to_string(),
            root.to_string_lossy().to_string(),
        );

        assert_eq!(result.unwrap(), b"fake-mp3-bytes".to_vec());
    }

    #[test]
    fn read_binary_file_rejects_outside_root() {
        let tmp = tempfile::tempdir().unwrap();
        let root = tmp.path().join("audio");
        let outside = tmp.path().join("outside.mp3");
        fs::write(&outside, b"secret").unwrap();

        let result = read_binary_file(
            outside.to_string_lossy().to_string(),
            root.to_string_lossy().to_string(),
        );

        assert!(result.is_err());
    }

    #[test]
    fn import_voice_sample_copies_allowed_audio_inside_managed_root() {
        let tmp = tempfile::tempdir().unwrap();
        let source = tmp.path().join("source.wav");
        let root = tmp.path().join("managed");
        fs::write(&source, b"voice-bytes").unwrap();

        let result = import_voice_sample(
            source.to_string_lossy().to_string(),
            root.to_string_lossy().to_string(),
            "sample-1/voice.wav".to_string(),
        )
        .unwrap();

        assert_eq!(result.relative_path, "sample-1/voice.wav");
        assert_eq!(result.file_name, "voice.wav");
        assert_eq!(result.mime_type, "audio/wav");
        assert_eq!(result.size_bytes, 11);
        assert_eq!(
            fs::read(root.join("sample-1/voice.wav")).unwrap(),
            b"voice-bytes"
        );
    }

    #[test]
    fn import_voice_sample_rejects_unsafe_or_unsupported_sources_without_leaking_paths() {
        let tmp = tempfile::tempdir().unwrap();
        let root = tmp.path().join("managed");
        let directory = tmp.path().join("directory");
        let unsupported = tmp.path().join("source.txt");
        fs::create_dir_all(&directory).unwrap();
        fs::write(&unsupported, b"not-audio").unwrap();

        for source in [directory, unsupported] {
            let result = import_voice_sample(
                source.to_string_lossy().to_string(),
                root.to_string_lossy().to_string(),
                "sample-1/voice.wav".to_string(),
            );
            let error = result.unwrap_err();
            assert!(!error.contains(source.to_string_lossy().as_ref()));
            assert!(!error.contains(root.to_string_lossy().as_ref()));
        }

        let traversal = import_voice_sample(
            tmp.path().join("source.wav").to_string_lossy().to_string(),
            root.to_string_lossy().to_string(),
            "../escape.wav".to_string(),
        );
        assert!(traversal.is_err());
    }

    #[test]
    fn import_voice_sample_rejects_symlinks_and_files_larger_than_25_mib() {
        let tmp = tempfile::tempdir().unwrap();
        let root = tmp.path().join("managed");
        let large = tmp.path().join("large.wav");
        fs::File::create(&large)
            .unwrap()
            .set_len(25 * 1024 * 1024 + 1)
            .unwrap();

        assert!(import_voice_sample(
            large.to_string_lossy().to_string(),
            root.to_string_lossy().to_string(),
            "sample-1/voice.wav".to_string(),
        )
        .is_err());

        let real = tmp.path().join("real.wav");
        fs::write(&real, b"voice").unwrap();
        let link = tmp.path().join("link.wav");
        #[cfg(unix)]
        std::os::unix::fs::symlink(&real, &link).unwrap();
        #[cfg(windows)]
        std::os::windows::fs::symlink_file(&real, &link).unwrap();

        assert!(import_voice_sample(
            link.to_string_lossy().to_string(),
            root.to_string_lossy().to_string(),
            "sample-1/voice.wav".to_string(),
        )
        .is_err());
    }

    #[test]
    fn import_voice_sample_rejects_a_symlinked_destination_parent() {
        let tmp = tempfile::tempdir().unwrap();
        let root = tmp.path().join("managed");
        let outside = tmp.path().join("outside");
        let source = tmp.path().join("source.wav");
        fs::create_dir_all(&root).unwrap();
        fs::create_dir_all(&outside).unwrap();
        fs::write(&source, b"voice").unwrap();
        let link = root.join("sample-1");
        #[cfg(unix)]
        std::os::unix::fs::symlink(&outside, &link).unwrap();
        #[cfg(windows)]
        std::os::windows::fs::symlink_dir(&outside, &link).unwrap();

        assert!(import_voice_sample(
            source.to_string_lossy().to_string(),
            root.to_string_lossy().to_string(),
            "sample-1/voice.wav".to_string(),
        )
        .is_err());
        assert!(!outside.join("voice.wav").exists());
    }

    #[test]
    fn import_voice_sample_cleans_up_partial_file_when_the_target_already_exists() {
        let tmp = tempfile::tempdir().unwrap();
        let root = tmp.path().join("managed");
        let source = tmp.path().join("source.wav");
        let target = root.join("sample-1/voice.wav");
        fs::create_dir_all(target.parent().unwrap()).unwrap();
        fs::write(&source, b"new-voice").unwrap();
        fs::write(&target, b"existing-voice").unwrap();

        assert!(import_voice_sample(
            source.to_string_lossy().to_string(),
            root.to_string_lossy().to_string(),
            "sample-1/voice.wav".to_string(),
        )
        .is_err());
        assert_eq!(fs::read(&target).unwrap(), b"existing-voice");
        assert!(fs::read_dir(target.parent().unwrap())
            .unwrap()
            .all(|entry| !entry
                .unwrap()
                .file_name()
                .to_string_lossy()
                .ends_with(".partial")));
    }

    #[test]
    fn delete_managed_voice_sample_only_removes_regular_files_inside_root() {
        let tmp = tempfile::tempdir().unwrap();
        let root = tmp.path().join("managed");
        let target = root.join("sample-1/voice.wav");
        fs::create_dir_all(target.parent().unwrap()).unwrap();
        fs::write(&target, b"voice").unwrap();

        delete_managed_voice_sample(
            target.to_string_lossy().to_string(),
            root.to_string_lossy().to_string(),
        )
        .unwrap();
        assert!(!target.exists());

        let outside = tmp.path().join("outside.wav");
        fs::write(&outside, b"outside").unwrap();
        assert!(delete_managed_voice_sample(
            outside.to_string_lossy().to_string(),
            root.to_string_lossy().to_string(),
        )
        .is_err());
        assert!(outside.exists());
    }

    #[test]
    fn delete_managed_voice_sample_rejects_symlinks_without_touching_their_target() {
        let tmp = tempfile::tempdir().unwrap();
        let root = tmp.path().join("managed");
        fs::create_dir_all(&root).unwrap();
        let outside = tmp.path().join("outside.wav");
        fs::write(&outside, b"outside").unwrap();
        let link = root.join("linked.wav");
        #[cfg(unix)]
        std::os::unix::fs::symlink(&outside, &link).unwrap();
        #[cfg(windows)]
        std::os::windows::fs::symlink_file(&outside, &link).unwrap();

        assert!(delete_managed_voice_sample(
            link.to_string_lossy().to_string(),
            root.to_string_lossy().to_string(),
        )
        .is_err());
        assert!(outside.exists());
    }

    #[test]
    fn read_managed_voice_sample_rejects_symlinks_and_reads_regular_files() {
        let tmp = tempfile::tempdir().unwrap();
        let root = tmp.path().join("managed");
        let target = root.join("sample-1/voice.wav");
        fs::create_dir_all(target.parent().unwrap()).unwrap();
        fs::write(&target, b"voice").unwrap();
        assert_eq!(
            read_managed_voice_sample(
                target.to_string_lossy().to_string(),
                root.to_string_lossy().to_string(),
            )
            .unwrap(),
            b"voice"
        );

        let outside = tmp.path().join("outside.wav");
        fs::write(&outside, b"outside").unwrap();
        let link = root.join("sample-1/linked.wav");
        #[cfg(unix)]
        std::os::unix::fs::symlink(&outside, &link).unwrap();
        #[cfg(windows)]
        std::os::windows::fs::symlink_file(&outside, &link).unwrap();
        assert!(read_managed_voice_sample(
            link.to_string_lossy().to_string(),
            root.to_string_lossy().to_string(),
        )
        .is_err());
    }

    #[test]
    fn check_audio_file_returns_true_for_file_inside_root() {
        let tmp = tempfile::tempdir().unwrap();
        let root = tmp.path().join("audio");
        let target = root.join("project-1/speech/speech.mp3");
        fs::create_dir_all(target.parent().unwrap()).unwrap();
        fs::write(&target, b"fake-mp3-bytes").unwrap();

        let result = check_audio_file(
            target.to_string_lossy().to_string(),
            root.to_string_lossy().to_string(),
        );

        assert_eq!(result.unwrap(), true);
    }

    #[test]
    fn check_audio_file_returns_false_for_missing_file_inside_root() {
        let tmp = tempfile::tempdir().unwrap();
        let root = tmp.path().join("audio");
        let target = root.join("project-1/speech/speech.mp3");

        let result = check_audio_file(
            target.to_string_lossy().to_string(),
            root.to_string_lossy().to_string(),
        );

        assert_eq!(result.unwrap(), false);
    }

    #[test]
    fn check_audio_file_returns_false_for_path_outside_root() {
        let tmp = tempfile::tempdir().unwrap();
        let root = tmp.path().join("audio");
        let outside = tmp.path().join("outside.mp3");
        fs::write(&outside, b"secret").unwrap();

        let result = check_audio_file(
            outside.to_string_lossy().to_string(),
            root.to_string_lossy().to_string(),
        );

        assert_eq!(result.unwrap(), false);
    }

    #[test]
    fn accepts_only_beijing_bailian_service_urls_for_native_json_posts() {
        assert!(is_allowed_bailian_json_url("https://workspace.cn-beijing.maas.aliyuncs.com/api/v1/services/audio/tts/customization"));
        assert!(!is_allowed_bailian_json_url(
            "https://api.example.com/api/v1/services/audio/tts/customization"
        ));
        assert!(!is_allowed_bailian_json_url(
            "http://workspace.cn-beijing.maas.aliyuncs.com/api/v1/services/audio/tts/customization"
        ));
        assert!(!is_allowed_bailian_json_url(
            "https://workspace.cn-beijing.maas.aliyuncs.com/api/v1/models"
        ));
    }

    #[test]
    fn accepts_only_bailian_result_oss_urls_for_native_audio_downloads() {
        assert!(is_allowed_bailian_audio_url(
            "http://dashscope-result-bj.oss-cn-beijing.aliyuncs.com/audio.wav?Expires=123&Signature=signed"
        ));
        assert!(is_allowed_bailian_audio_url(
            "https://dashscope-result-wlcb.oss-cn-wulanchabu.aliyuncs.com/audio.wav"
        ));
        assert!(!is_allowed_bailian_audio_url("http://127.0.0.1/audio.wav"));
        assert!(!is_allowed_bailian_audio_url(
            "http://dashscope-result-bj.oss-cn-beijing.aliyuncs.com.evil.example/audio.wav"
        ));
        assert!(!is_allowed_bailian_audio_url(
            "ftp://dashscope-result-bj.oss-cn-beijing.aliyuncs.com/audio.wav"
        ));
    }

    #[test]
    fn extracts_a_redacted_bailian_error_diagnostic_without_preserving_urls_or_tokens() {
        let diagnostic = parse_bailian_error_diagnostic(
            r#"{"code":"InvalidParameter","message":"音频时长不能超过 60 秒","request_id":"request-123"}"#,
        )
        .unwrap();
        assert_eq!(diagnostic.code.as_deref(), Some("InvalidParameter"));
        assert_eq!(
            diagnostic.message.as_deref(),
            Some("音频时长不能超过 60 秒")
        );
        assert_eq!(diagnostic.request_id.as_deref(), Some("request-123"));

        let redacted = parse_bailian_error_diagnostic(
            r#"{"message":"https://bucket.example.com/sample?Signature=secret"}"#,
        )
        .unwrap();
        assert_eq!(
            redacted.message.as_deref(),
            Some("服务端诊断包含敏感内容，已隐藏")
        );
    }
}

pub fn run() {
    tauri::Builder::default()
        .plugin(tauri_plugin_dialog::init())
        .plugin(tauri_plugin_fs::init())
        .plugin(tauri_plugin_sql::Builder::new().build())
        .invoke_handler(tauri::generate_handler![
            render_compose,
            probe_ffmpeg,
            extract_audio,
            detect_ffmpeg,
            probe_local_whisper,
            run_local_whisper,
            write_binary_file,
            read_binary_file,
            export_audio_file,
            reveal_audio_file,
            check_audio_file,
            probe_audio_duration,
            import_voice_sample,
            read_managed_voice_sample,
            delete_managed_voice_sample,
            bailian_json_post,
            bailian_audio_get
        ])
        .run(tauri::generate_context!())
        .expect("error while running Mirax AI desktop application");
}
