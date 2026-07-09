use std::{fs, path::Path, process::Command};

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
fn extract_audio(ffmpeg_path: String, input_path: String, output_path: String) -> Result<(), String> {
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
    let trimmed = python_path.trim();
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
    let trimmed_python = python_path.trim();
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
            run_local_whisper
        ])
        .run(tauri::generate_context!())
        .expect("error while running Mirax AI desktop application");
}
