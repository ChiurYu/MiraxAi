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

pub fn run() {
    tauri::Builder::default()
        .plugin(tauri_plugin_dialog::init())
        .plugin(tauri_plugin_sql::Builder::new().build())
        .invoke_handler(tauri::generate_handler![render_compose, probe_ffmpeg, extract_audio])
        .run(tauri::generate_context!())
        .expect("error while running Mirax AI desktop application");
}
