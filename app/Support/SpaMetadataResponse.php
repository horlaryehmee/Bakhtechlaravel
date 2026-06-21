<?php

namespace App\Support;

use Illuminate\Http\Response;

class SpaMetadataResponse
{
    public static function make(array $metadata, bool $private = false): Response
    {
        $index = public_path('index.html');
        if (! is_file($index)) {
            return response('Frontend build not found.', 503);
        }

        $html = (string) file_get_contents($index);
        $dom = new \DOMDocument('1.0', 'UTF-8');
        $previous = libxml_use_internal_errors(true);
        $dom->loadHTML($html, LIBXML_NONET | LIBXML_NOERROR | LIBXML_NOWARNING);
        libxml_clear_errors();
        libxml_use_internal_errors($previous);

        $xpath = new \DOMXPath($dom);
        $head = $xpath->query('//head')->item(0);
        if (! $head) {
            return response($html, 200, ['Content-Type' => 'text/html; charset=UTF-8']);
        }

        self::setTitle($dom, $xpath, (string) $metadata['title']);
        self::setMeta($dom, $xpath, $head, 'name', 'description', (string) $metadata['description']);
        self::setMeta($dom, $xpath, $head, 'property', 'og:title', (string) $metadata['title']);
        self::setMeta($dom, $xpath, $head, 'property', 'og:description', (string) $metadata['description']);
        self::setMeta($dom, $xpath, $head, 'property', 'og:type', (string) ($metadata['type'] ?? 'website'));
        self::setMeta($dom, $xpath, $head, 'property', 'og:url', (string) $metadata['url']);
        self::setMeta($dom, $xpath, $head, 'property', 'og:image', (string) $metadata['image']);
        self::setMeta($dom, $xpath, $head, 'property', 'og:image:secure_url', (string) $metadata['image']);
        self::setMeta($dom, $xpath, $head, 'property', 'og:image:alt', (string) ($metadata['imageAlt'] ?? $metadata['title']));
        self::setMeta($dom, $xpath, $head, 'name', 'twitter:card', 'summary_large_image');
        self::setMeta($dom, $xpath, $head, 'name', 'twitter:title', (string) $metadata['title']);
        self::setMeta($dom, $xpath, $head, 'name', 'twitter:description', (string) $metadata['description']);
        self::setMeta($dom, $xpath, $head, 'name', 'twitter:image', (string) $metadata['image']);
        self::setMeta($dom, $xpath, $head, 'name', 'twitter:image:alt', (string) ($metadata['imageAlt'] ?? $metadata['title']));
        self::setCanonical($dom, $xpath, $head, (string) $metadata['url']);

        if ($private) {
            self::setMeta($dom, $xpath, $head, 'name', 'robots', 'noindex, nofollow, noarchive');
        }

        $response = response($dom->saveHTML() ?: $html, 200, [
            'Content-Type' => 'text/html; charset=UTF-8',
        ]);

        return $private ? $response->header('Cache-Control', 'private, no-store') : $response;
    }

    private static function setTitle(\DOMDocument $dom, \DOMXPath $xpath, string $value): void
    {
        $node = $xpath->query('//head/title')->item(0);
        if (! $node) {
            $node = $dom->createElement('title');
            $xpath->query('//head')->item(0)?->appendChild($node);
        }
        $node->textContent = $value;
    }

    private static function setMeta(\DOMDocument $dom, \DOMXPath $xpath, \DOMNode $head, string $attribute, string $key, string $value): void
    {
        $query = sprintf('//head/meta[@%s=%s]', $attribute, self::xpathLiteral($key));
        $node = $xpath->query($query)->item(0);
        if (! $node instanceof \DOMElement) {
            $node = $dom->createElement('meta');
            $node->setAttribute($attribute, $key);
            $head->appendChild($node);
        }
        $node->setAttribute('content', $value);
    }

    private static function setCanonical(\DOMDocument $dom, \DOMXPath $xpath, \DOMNode $head, string $url): void
    {
        $node = $xpath->query('//head/link[@rel="canonical"]')->item(0);
        if (! $node instanceof \DOMElement) {
            $node = $dom->createElement('link');
            $node->setAttribute('rel', 'canonical');
            $head->appendChild($node);
        }
        $node->setAttribute('href', $url);
    }

    private static function xpathLiteral(string $value): string
    {
        return "'".str_replace("'", '', $value)."'";
    }
}
