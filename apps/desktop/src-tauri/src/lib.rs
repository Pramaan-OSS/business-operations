use tauri::{Manager, WebviewUrl, WebviewWindowBuilder};
use tauri_plugin_deep_link::DeepLinkExt;

#[tauri::command]
fn show_window(app: tauri::AppHandle) -> Result<(), String> {
    let window = app.get_webview_window("main").ok_or("Window not found")?;
    window.show().map_err(|e| e.to_string())?;
    window.set_focus().map_err(|e| e.to_string())
}

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .plugin(tauri_plugin_opener::init())
        .plugin(tauri_plugin_deep_link::init())
        .plugin(tauri_plugin_dialog::init())
        .plugin(tauri_plugin_fs::init())
        .invoke_handler(tauri::generate_handler![show_window])
        .setup(|app| {
            let url = tauri::Url::parse("http://localhost:3001")?;
            WebviewWindowBuilder::new(app, "main", WebviewUrl::External(url))
                .title("Business Operations")
                .inner_size(1142.0, 732.0)
                .min_inner_size(400.0, 600.0)
                .build()?;
            let handle = app.handle().clone();
            app.deep_link().on_open_url(move |event| {
                if let Some(window) = handle.get_webview_window("main") {
                    // A deep link may focus the local app; it cannot select an external host.
                    if event.urls().iter().any(|url| url.scheme() == "business-operations") {
                        let _ = window.show();
                        let _ = window.set_focus();
                    }
                }
            });
            Ok(())
        })
        .run(tauri::generate_context!())
        .expect("Could not start the local desktop window");
}
