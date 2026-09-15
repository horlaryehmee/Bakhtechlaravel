<?php

namespace Tests\Feature;

use Tests\TestCase;

class UploadedMediaStreamingTest extends TestCase
{
    public function test_uploaded_video_supports_byte_range_requests(): void
    {
        $filename = 'range-test-'.uniqid().'.mp4';
        $directory = storage_path('app/public/uploads');
        $path = $directory.DIRECTORY_SEPARATOR.$filename;

        if (! is_dir($directory)) {
            mkdir($directory, 0755, true);
        }

        file_put_contents($path, '0123456789');

        try {
            $response = $this->withHeader('Range', 'bytes=2-5')
                ->get('/api/uploads/'.$filename);

            $response->assertStatus(206)
                ->assertHeader('Accept-Ranges', 'bytes')
                ->assertHeader('Content-Range', 'bytes 2-5/10')
                ->assertHeader('Content-Length', '4')
                ->assertHeader('Content-Type', 'video/mp4');

            $this->assertSame('2345', $response->streamedContent());
        } finally {
            @unlink($path);
        }
    }

    public function test_uploaded_video_rejects_an_out_of_bounds_range(): void
    {
        $filename = 'range-test-'.uniqid().'.mp4';
        $directory = storage_path('app/public/uploads');
        $path = $directory.DIRECTORY_SEPARATOR.$filename;

        if (! is_dir($directory)) {
            mkdir($directory, 0755, true);
        }

        file_put_contents($path, '0123456789');

        try {
            $this->withHeader('Range', 'bytes=20-30')
                ->get('/api/uploads/'.$filename)
                ->assertStatus(416)
                ->assertHeader('Accept-Ranges', 'bytes')
                ->assertHeader('Content-Range', 'bytes */10');
        } finally {
            @unlink($path);
        }
    }
}
