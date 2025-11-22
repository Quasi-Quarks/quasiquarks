<?php
header("Access-Control-Allow-Origin: *");
header("Access-Control-Allow-Headers: Content-Type");
header("Access-Control-Allow-Methods: POST, OPTIONS");
header("Content-Type: application/json; charset=utf-8");

// Handle preflight
if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(200);
    exit;
}

$servername = "localhost";
$username   = "chatuser";
$password   = "YfiX9sGXCsam7J7";
$dbname     = "users_db";

$conn = new mysqli($servername, $username, $password, $dbname);

if ($conn->connect_error) {
    echo json_encode([
        "success" => false,
        "error"   => "Connection failed: " . $conn->connect_error
    ]);
    exit;
}

// ---- Get form data ----
$username = isset($_POST['username']) ? trim($_POST['username']) : '';
$message  = isset($_POST['message'])  ? trim($_POST['message'])  : '';

// Basic validation
if ($username === '' || $message === '') {
    echo json_encode([
        "success" => false,
        "error"   => "username and message are required"
    ]);
    $conn->close();
    exit;
}

// ---- Handle file upload (optional) ----
$uploadDir = "uploads/";
$mediaPath = "";  // store ONLY the file name if upload succeeds

if (!empty($_FILES['fileToUpload']['name'])) {

    if (!is_dir($uploadDir)) {
        mkdir($uploadDir, 0777, true);
    }

    $fileName   = basename($_FILES["fileToUpload"]["name"]);
    $targetFile = $uploadDir . $fileName;
    $uploadOk   = 1;

    $ext = strtolower(pathinfo($targetFile, PATHINFO_EXTENSION));

    $imageExts = ["jpg", "jpeg", "png", "gif", "webp"];
    $videoExts = ["mp4", "webm", "ogg"];
    $audioExts = ["mp3", "wav", "ogg", "m4a"];

    $allowed = array_merge($imageExts, $videoExts, $audioExts);

    // check allowed extension
    if (!in_array($ext, $allowed)) {
        $uploadOk = 0;
    } 

    // Check file size (e.g. 20MB limit; adjust if needed)
    if ($_FILES["fileToUpload"]["size"] > 20 * 1024 * 1024) { // ~20MB
        $uploadOk = 0;
    }

    // For images, verify that it's a real image
    if ($uploadOk == 1 && in_array($ext, $imageExts)) {
        $check = @getimagesize($_FILES["fileToUpload"]["tmp_name"]);
        if ($check === false) {
            $uploadOk = 0;
        }
    }

    if ($uploadOk == 1) {
        if (move_uploaded_file($_FILES["fileToUpload"]["tmp_name"], $targetFile)) {
            $mediaPath = $fileName; // only the file name stored in DB
        } else {
            $mediaPath = "";
        }
    } else {
        $mediaPath = "";
    }
}

// ---- Insert into DB ----
// Assuming chat table columns: id (AI), username, chat_id (message), media_id (file name), time_id (timestamp)
$stmt = $conn->prepare(
    "INSERT INTO chat (username, chat_id, media_id, time_id) VALUES (?, ?, ?, NOW())"
);
$stmt->bind_param("sss", $username, $message, $mediaPath);

if ($stmt->execute()) {
    echo json_encode([
        "success"    => true,
        "insert_id"  => $stmt->insert_id,
        "username"   => $username,
        "message"    => $message,
        "media_path" => $mediaPath
    ]);
} else {
    echo json_encode([
        "success" => false,
        "error"   => "DB error: " . $stmt->error
    ]);
}

$stmt->close();
$conn->close();
?>
