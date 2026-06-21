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

        $title = (string) $metadata['title'];
        $description = (string) $metadata['description'];
        $image = (string) $metadata['image'];
        self::setTitle($dom, $xpath, $title);
        self::setMeta($dom, $xpath, $head, 'name', 'description', $description);
        self::setMeta($dom, $xpath, $head, 'property', 'og:title', (string) ($metadata['ogTitle'] ?? $title));
        self::setMeta($dom, $xpath, $head, 'property', 'og:description', (string) ($metadata['ogDescription'] ?? $description));
        self::setMeta($dom, $xpath, $head, 'property', 'og:type', (string) ($metadata['type'] ?? 'website'));
        self::setMeta($dom, $xpath, $head, 'property', 'og:url', (string) $metadata['url']);
        self::setMeta($dom, $xpath, $head, 'property', 'og:image', $image);
        self::setMeta($dom, $xpath, $head, 'property', 'og:image:secure_url', $image);
        self::setMeta($dom, $xpath, $head, 'property', 'og:image:alt', (string) ($metadata['imageAlt'] ?? $metadata['title']));
        self::setMeta($dom, $xpath, $head, 'name', 'twitter:card', 'summary_large_image');
        self::setMeta($dom, $xpath, $head, 'name', 'twitter:title', (string) ($metadata['twitterTitle'] ?? $metadata['ogTitle'] ?? $title));
        self::setMeta($dom, $xpath, $head, 'name', 'twitter:description', (string) ($metadata['twitterDescription'] ?? $metadata['ogDescription'] ?? $description));
        self::setMeta($dom, $xpath, $head, 'name', 'twitter:image', (string) ($metadata['twitterImage'] ?? $image));
        self::setMeta($dom, $xpath, $head, 'name', 'twitter:image:alt', (string) ($metadata['imageAlt'] ?? $metadata['title']));
        self::setCanonical($dom, $xpath, $head, (string) $metadata['url']);

        if ($private) {
            self::setMeta($dom, $xpath, $head, 'name', 'robots', 'noindex, nofollow, noarchive');
        } else {
            self::setMeta($dom, $xpath, $head, 'name', 'robots', (string) ($metadata['robots'] ?? 'index,follow'));
        }

        if (! $private && ! empty($metadata['schema'])) {
            self::setSchema($dom, $xpath, $head, (array) $metadata['schema']);
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

    private static function setSchema(\DOMDocument $dom, \DOMXPath $xpath, \DOMNode $head, array $schema): void
    {
        $node = $xpath->query('//head/script[@id="cms-page-schema"]')->item(0);
        if (! $node instanceof \DOMElement) {
            $node = $dom->createElement('script');
            $node->setAttribute('id', 'cms-page-schema');
            $node->setAttribute('type', 'application/ld+json');
            $head->appendChild($node);
        }
        $node->textContent = json_encode($schema, JSON_UNESCAPED_SLASHES | JSON_UNESCAPED_UNICODE) ?: '{}';
    }

    private static function xpathLiteral(string $value): string
    {
        return "'".str_replace("'", '', $value)."'";
    }
}
