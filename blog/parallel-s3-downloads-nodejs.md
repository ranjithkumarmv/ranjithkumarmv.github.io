---
title: Fast parallel S3 downloads in Node.js with s3-multipartdownload
author: Ranjith Kumar MV
date: 2026-10-20
canonical: https://ranjithkumarmv.com/blog/parallel-s3-downloads-nodejs.html
package: s3-multipartdownload
npm: https://www.npmjs.com/package/s3-multipartdownload
repository: https://github.com/ranjithkumarmv/s3-multipartdownload
tags: [nodejs, aws-s3, aws-sdk-v3, parallel-download, open-source]
---

# Fast parallel S3 downloads in Node.js with s3-multipartdownload

A single `GetObject` downloads an S3 object over one connection, and one connection rarely fills your bandwidth. [s3-multipartdownload](https://www.npmjs.com/package/s3-multipartdownload) splits large S3 objects into byte ranges, downloads them in parallel with AWS SDK v3, and streams each range straight to its place in the output file.

## Summary

- **Problem:** AWS SDK v3 for JavaScript has a managed uploader (`@aws-sdk/lib-storage`) but no parallel downloader, so a large `GetObject` runs over one connection.
- **Fix:** `s3-multipartdownload` fetches byte ranges concurrently and writes each one at its offset in a pre-sized file.
- **Result:** a 500 MB object went from 14.3 s to 2.0 s (7.1×) in a simulated benchmark, with memory flat at about 130 MB.

## When to use it

- Use it to download **large S3 objects (tens of MB and up) to a local file** from Node.js, Lambda or a worker.
- Use plain `GetObject` for small objects, or when you need the body as a stream or buffer rather than a file.
- Use `aws s3 cp` in shell scripts; it also downloads in parallel.

## Install

```bash
npm install s3-multipartdownload @aws-sdk/client-s3
```

Requires Node.js 20.3+. `@aws-sdk/client-s3` v3 is a peer dependency.

## Usage

```js
const { S3Client } = require('@aws-sdk/client-s3')
const { download } = require('s3-multipartdownload')

const s3 = new S3Client({ region: 'us-east-1' })

const file = await download(s3, { Bucket: 'my-bucket', Key: 'datasets/big-file.parquet' }, {
  download_dir: './downloads',
  parallel_count: 8
})
// file === 'downloads/big-file.parquet'
```

ES modules and TypeScript (types are bundled):

```ts
import { S3Client } from '@aws-sdk/client-s3'
import { download } from 's3-multipartdownload'

const file: string = await download(new S3Client({}), { Bucket: 'my-bucket', Key: 'video.mp4' })
```

### Progress

```js
await download(s3, params, {
  onProgress: ({ downloadedBytes, totalBytes }) => console.log(downloadedBytes, '/', totalBytes)
})
```

### Cancel or time out

```js
await download(s3, params, { abortSignal: AbortSignal.timeout(60_000) })
```

### Versions, SSE-C and requester pays

Any `HeadObject`/`GetObject` parameter passes through:

```js
await download(s3, {
  Bucket: 'my-bucket',
  Key: 'secret.bin',
  VersionId: '3HL4kqtJlcpXroDTDmJ',
  SSECustomerAlgorithm: 'AES256',
  SSECustomerKey: process.env.SSE_KEY,
  RequestPayer: 'requester'
}, { download_dir: './out', file_name: 'secret-v3.bin' })
```

### S3-compatible storage (MinIO, Cloudflare R2, Wasabi)

```js
const s3 = new S3Client({ endpoint: 'https://<account>.r2.cloudflarestorage.com', region: 'auto' })
await download(s3, { Bucket: 'assets', Key: 'build.tar.gz' })
```

## API

`download(s3Client, s3Params, options?) → Promise<string>` resolves to the downloaded file's path.

| Option | Default | Description |
| --- | --- | --- |
| `download_dir` | `.` | Output directory, created if missing |
| `file_name` | basename of `Key` | Output file name |
| `parallel_count` | `3` | Maximum concurrent range requests |
| `part_size` | `8 MiB` | Bytes per range request |
| `retries` | `3` | Extra attempts per part on network/5xx errors (4xx other than 408/429 is not retried) |
| `abortSignal` | | Cancels the download and removes the temp file |
| `onProgress` | | Called with `{ downloadedBytes, totalBytes }` |

A `Range` in `s3Params` is ignored. The caller's `s3Params` object is never modified.

## How it works

1. `HeadObject` reads the object's size and ETag.
2. A temp file `<name>.download` is created at full size so every part can write at its own offset.
3. Ranges of `part_size` bytes are fetched by a worker pool of `parallel_count`. Each request sends `If-Match: <ETag>`, so an object overwritten mid-download fails the download instead of mixing versions.
4. A failed part is retried with backoff. A fatal error cancels in-flight parts and deletes the temp file.
5. When every part is written, the temp file is renamed to the final name.

## Benchmarks

Median of 3 runs, SHA-256 verified, Apple M1, Node 22, 8 MiB parts.

| Strategy | 100 MB | 500 MB | 500 MB throughput | Speed-up | Peak memory |
| --- | ---: | ---: | ---: | ---: | ---: |
| Single `GetObject` | 2.91 s | 14.29 s | 35 MB/s | 1.0× | 134 MB |
| s3-multipartdownload ×4 | 1.01 s | 4.48 s | 112 MB/s | 3.2× | 133 MB |
| s3-multipartdownload ×8 | 0.55 s | 2.49 s | 201 MB/s | 5.7× | 130 MB |
| s3-multipartdownload ×16 | 0.41 s | 2.01 s | 249 MB/s | 7.1× | 127 MB |

These results come from a local S3-compatible server that caps each connection at 40 MB/s and total bandwidth at 400 MB/s, with 20 ms latency per request. They are not measurements against live Amazon S3. Real gains depend on network, region and instance size. To measure against a real bucket:

```bash
node bench/benchmark.js --bucket my-bucket --key path/to/big.bin --region us-east-1
```

## Tuning

- Laptops and small instances: `parallel_count` 4–8.
- EC2 in the same region as the bucket: `parallel_count` 16–32; raise until throughput stops improving.
- Keep `part_size` at 8–16 MiB. Each part is one billed GET request; a 1 GB object at 8 MiB is 128 requests.

## Upgrading from 1.x

- Pass an AWS SDK v3 `S3Client` instead of a v2 `AWS.S3` instance.
- `parallel_count` is now a concurrency limit; the object is split into `part_size` chunks.
- The promise resolves to the output file path. The library no longer logs or loads `.env`.

## FAQ

**Is this the same as S3 multipart upload?** No. Multipart upload is an S3 API. A multipart download is a client-side technique using HTTP `Range` requests on an ordinary `GetObject`; it works on any object.

**Does it cost more?** Each part is one GET request, a fraction of a cent per GB at standard pricing. Bytes transferred are the same as a single download.

**Can it download to a stream or buffer?** Not yet; it writes to a file so parts can land out of order with flat memory.

## Links

- npm: https://www.npmjs.com/package/s3-multipartdownload
- GitHub: https://github.com/ranjithkumarmv/s3-multipartdownload
- AWS S3 performance guidelines: https://docs.aws.amazon.com/AmazonS3/latest/userguide/optimizing-performance-guidelines.html
- Author: Ranjith Kumar MV, https://ranjithkumarmv.com/
