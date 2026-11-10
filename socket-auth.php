<?php
require_once __DIR__ . '/settings.php';
require_once __DIR__ . '/demo-security.php';
if (($_SERVER['REQUEST_METHOD'] ?? '') !== 'POST' || (int)($_SERVER['CONTENT_LENGTH'] ?? 0) > 8192) demo_json(['login'=>false], 400);
$input = json_decode(file_get_contents('php://input', false, null, 0, 8193), true);
demo_json(['login'=>is_array($input) && demo_pin_valid($input, $options)]);
