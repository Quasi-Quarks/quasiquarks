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
$mediaPath = "";  // store only file name here

if (!empty($_FILES['fileToUpload']['name'])) {

    // Ensure uploads/ exists
    if (!is_dir($uploadDir)) {
        mkdir($uploadDir, 0777, true);
    }

    $fileName      = basename($_FILES["fileToUpload"]["name"]); // <-- ONLY FILE NAME
    $targetFile    = $uploadDir . $fileName;                     // file path for upload
    $uploadOk      = 1;
    $imageFileType = strtolower(pathinfo($targetFile, PATHINFO_EXTENSION));

    // Check if it's an image
    $check = getimagesize($_FILES["fileToUpload"]["tmp_name"]);
    if ($check === false) {
        $uploadOk = 0;
    }

    // Check size (~500KB limit)
    if ($_FILES["fileToUpload"]["size"] > 500000) {
        $uploadOk = 0;
    }

    // Allowed types
    $allowed = ["jpg", "jpeg", "png", "gif"];
    if (!in_array($imageFileType, $allowed)) {
        $uploadOk = 0;
    }

    if ($uploadOk == 1) {
        if (move_uploaded_file($_FILES["fileToUpload"]["tmp_name"], $targetFile)) {
            $mediaPath = $fileName; // <-- store only file name in DB
        } else {
            $mediaPath = "";
        }
    } else {
        $mediaPath = "";
    }
}

// ---- Insert into DB ----
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
