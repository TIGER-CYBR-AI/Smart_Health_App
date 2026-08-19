[app]
title = Smart Health App
package.name = smarthealthapp
package.domain = org.tigertechnology
source.dir = .
source.include_exts = py,png,jpg,kv,atlas
version = 1.0
requirements = python3,kivy,kivymd,pillow
orientation = portrait
fullscreen = 0
android.archs = arm64-v8a, armeabi-v7a
android.allow_backup = True
android.api = 33
android.minapi = 24
android.sdk_build_tools_version = 33.0.0
android.accept_sdk_license = True
android.skip_apk_rescale = True

[buildozer]
log_level = 2
warn_on_root = 0