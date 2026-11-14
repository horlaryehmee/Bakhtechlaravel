<!doctype html>
<html lang="en"><head><meta charset="utf-8"><title>Your Bakhtech workspace</title></head>
<body style="margin:0;background:#f5f6f0;font-family:Arial,sans-serif;color:#283122;padding:32px 16px">
<table role="presentation" style="max-width:560px;width:100%;margin:auto;background:white;border:1px solid #e4e8dc;border-radius:12px"><tr><td style="padding:36px">
<p style="font-size:12px;letter-spacing:2px;color:#7b8969">BAKHTECH SOLUTIONS</p>
<h1 style="font-size:27px">Your workspace is ready.</h1>
<p>Hello {{ $name }},</p><p style="line-height:1.8">Your project team has invited you to the Bakhtech client portal. View your projects, share content, upload files, and follow your progress in one place.</p>
<p style="margin:30px 0"><a href="{{ $url }}" style="display:inline-block;background:#f3ce49;color:#252b20;text-decoration:none;padding:15px 24px;border-radius:6px;font-weight:bold">See my dashboard &rarr;</a></p>
@if($passwordless)
<div style="background:#fff7dc;padding:18px;border-radius:6px;font-size:13px;line-height:1.8"><strong>Keep this link private.</strong> Anyone with this link can access your portal. Do not forward or share it. It works for 30 days unless replaced or revoked. You can keep using passwordless access, set a password in Account settings, or sign in with a matching Google account when enabled.</div>
<p style="font-size:13px;line-height:1.8">Once you set a password, this link will stop signing you in and will take you to the login page instead.</p>
@else
<p style="font-size:13px;line-height:1.8">Sign in using your password or your connected Google account. This button opens the login page.</p>
@endif
<p style="color:#7b8969;font-size:12px;margin-top:28px">Questions? Contact your Bakhtech project manager.</p>
</td></tr></table></body></html>
