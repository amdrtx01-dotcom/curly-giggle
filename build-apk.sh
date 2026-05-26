#!/bin/bash
# Build DroneStrike APK using Cordova
# Requirements: Node.js, Java 17+, Android SDK, Gradle

set -e

echo "=== DroneStrike APK Builder ==="

# Check prerequisites
command -v node >/dev/null 2>&1 || { echo "Node.js is required"; exit 1; }
command -v java >/dev/null 2>&1 || { echo "Java JDK 17+ is required"; exit 1; }

if [ -z "$ANDROID_HOME" ]; then
    echo "ANDROID_HOME not set. Please set it to your Android SDK path."
    exit 1
fi

# Install Cordova if needed
if ! command -v cordova &>/dev/null; then
    echo "Installing Cordova..."
    npm install -g cordova
fi

# Create Cordova project
BUILD_DIR="/tmp/dronestrike-build"
rm -rf "$BUILD_DIR"
cordova create "$BUILD_DIR" com.dronestrike.game DroneStrike

# Copy game files
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
rm -rf "$BUILD_DIR/www"/*
cp "$SCRIPT_DIR/index.html" "$BUILD_DIR/www/"
cp -r "$SCRIPT_DIR/css" "$BUILD_DIR/www/"
cp -r "$SCRIPT_DIR/js" "$BUILD_DIR/www/"

# Copy config
cat > "$BUILD_DIR/config.xml" << 'EOF'
<?xml version='1.0' encoding='utf-8'?>
<widget id="com.dronestrike.game" version="1.0.0" xmlns="http://www.w3.org/ns/widgets" xmlns:cdv="http://cordova.apache.org/ns/1.0">
    <name>DroneStrike</name>
    <description>3D FPV Drone Combat Game</description>
    <content src="index.html" />
    <allow-intent href="http://*/*" />
    <allow-intent href="https://*/*" />
    <allow-navigation href="*" />
    <preference name="Orientation" value="landscape" />
    <preference name="Fullscreen" value="true" />
    <preference name="KeepRunning" value="true" />
    <preference name="DisallowOverscroll" value="true" />
    <preference name="android-minSdkVersion" value="24" />
    <preference name="android-targetSdkVersion" value="36" />
    <preference name="android-compileSdkVersion" value="36" />
    <platform name="android">
        <preference name="ScreenOrientation" value="landscape" />
    </platform>
</widget>
EOF

# Add Android platform and build
cd "$BUILD_DIR"
cordova platform add android
cordova build android

# Copy APK
APK_PATH="$BUILD_DIR/platforms/android/app/build/outputs/apk/debug/app-debug.apk"
OUTPUT="$SCRIPT_DIR/DroneStrike.apk"
cp "$APK_PATH" "$OUTPUT"

echo ""
echo "=== APK built successfully ==="
echo "Output: $OUTPUT"
echo "Size: $(du -h "$OUTPUT" | cut -f1)"
echo ""
echo "Install on device: adb install $OUTPUT"
