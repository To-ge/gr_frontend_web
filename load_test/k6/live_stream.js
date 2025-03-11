import http from 'k6/http';
import { check } from 'k6';
import encoding from 'k6/encoding';

export const options = {
  vus: 100, // 同時接続ユーザー数
  iterations: 100, // 100回のリクエストを実行
  duration: '20s',
};

export default function () {
  const apiHost = __ENV.API_HOST || 'http://localhost:9090';
  const url = `${apiHost}/api/v1/stream/location/live`;
  const id = __VU;

  const res = http.get(url, { responseType: 'binary' }); // ストリームのレスポンスを取得
  check(res, {
    'status is 200': (r) => r.status === 200,
  });

//   // チャンクごとのログ処理
//   const reader = res.body ? res.body.getReader() : null;
//   const decoder = new TextDecoder('utf-8');
//   let chunkCount = 0;

//   if (reader) {
//     let result;
//     let buffer = '';

//     while (!(result = reader.read()).done) {
//       const chunk = decoder.decode(result.value || new Uint8Array(), {
//         stream: true,
//       });
//       buffer += chunk;
//       chunkCount++;

//       console.log(`[VU: ${__VU}, Chunk: ${chunkCount}] ${chunk}`);
//     }
    let chunkCount = 0;

    if (res.body) {
    const buffer = new Uint8Array(res.body); // バイナリデータを取得
    const decodedData = encoding.decode(buffer, 'utf-8'); // UTF-8としてデコード
    const chunks = decodedData.split('\n'); // チャンクごとに分割（仮定として改行で区切る）

    for (const chunk of chunks) {
        if (chunk) {
            chunkCount++;
            console.log(`[VU: ${id}, Chunk: ${chunkCount}] ${chunk}`);
        }
    }

    console.log(`User ${id} received ${chunkCount} chunks`);
  } else {
    console.error(`User ${id} failed to get response reader.`);
  }
}
