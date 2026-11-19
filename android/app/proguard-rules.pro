# Add project specific ProGuard rules here.
# By default, the flags in this file are appended to flags specified
# in /usr/local/Cellar/android-sdk/24.3.3/tools/proguard/proguard-android.txt
# You can edit the include path and order by changing the proguardFiles
# directive in build.gradle.
#
# For more details, see
#   http://developer.android.com/guide/developing/tools/proguard.html

# Add any project specific keep options here:

# ---------------------------------------------------------------------------
# R8 is on for release builds (Google Play flags un-obfuscated bundles).
# React Native core and most libraries ship their own consumer rules; these
# cover the ones that don't.
# ---------------------------------------------------------------------------

# react-native-html-to-pdf places a class in the android.print package to
# reach package-private PrintDocumentAdapter callbacks; renaming breaks it.
-keep class android.print.** { *; }

# react-native-webview: methods called from page JavaScript by name.
-keepclassmembers class * {
    @android.webkit.JavascriptInterface <methods>;
}
-keep class com.reactnativecommunity.webview.** { *; }

# react-native-blob-util (invoice/photo downloads), as its docs recommend.
-keep class com.ReactNativeBlobUtil.** { *; }
-dontwarn com.ReactNativeBlobUtil.**

# OkHttp / Okio, used by React Native networking and blob-util.
-dontwarn okhttp3.**
-dontwarn org.conscrypt.**
-dontwarn org.bouncycastle.**
-dontwarn org.openjsse.**

# Optional JPEG 2000 decoder referenced by the PDF library; not bundled.
-dontwarn com.gemalto.jp2.**
