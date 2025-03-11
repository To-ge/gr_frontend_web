const { ReadableStream } = require('stream/web');
const fs = require('fs');
const path = require('path');
// const fetch = require('node-fetch'); // Fetch API を利用
const { TextDecoder } = require('util');
const dotenv = require('dotenv');

dotenv.config({ path: '../.env' });

const apiHost = process.env.API_HOST || 'http://localhost:9090'; // APIホスト
const numRequests = 600; // 同時リクエスト数
console.log(process.env.API_HOST)

// ログディレクトリ作成
const logDir = path.join(__dirname, 'logs');
if (!fs.existsSync(logDir)) {
  fs.mkdirSync(logDir);
}

const totalLogFilePath = path.join(logDir, `test_${numRequests}_live_stream.log`);

const logger = (logFilePath, data) => {
    const logMessage = `${data.count},${data.unixTime},${data.latitude},${data.longitude},${data.altitude}\n`;

    // ログをファイルに書き込む
    fs.appendFileSync(logFilePath, logMessage, 'utf8');
};

const totalLogger = (logFilePath, data) => {
    const logMessage = `${data.id},${data.startTime},${data.endTime},${data.span},${data.count}\n`;

    // ログをファイルに書き込む
    fs.appendFileSync(logFilePath, logMessage, 'utf8');
};

// リクエスト送信関数
const fetchLiveStream = async (requestId) => {
  console.log(`Request ${requestId}: Starting live stream`);

  const controller = new AbortController();

  const logFilePath = path.join(logDir, `client_${requestId}.log`);

  let startTime;
  let count = 0;

  try {
    const response = await fetch(`${apiHost}/api/v1/stream/location/live`, {
      signal: controller.signal,
    });

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    startTime = Date.now() / 1000;

    const reader = response.body.getReader();
    const decoder = new TextDecoder('utf-8');
    let buffer = '';

    console.log(`Request ${requestId}: Connected and receiving data...`);

    while (true) {
      const { done, value } = await reader.read();
      if (done) break;

      buffer += decoder.decode(value, { stream: true });

      // データを処理
      const lines = buffer.split('\n');
      buffer = lines.pop() ?? ''; // 最後の未完了部分を保持
      lines.forEach((line) => {
        if (line.trim()) {
          try {
            const parsedData = JSON.parse(line);
            console.log(`Request ${requestId}, Chunk ${++count}:`, parsedData);

            // const formatedData = {
            //   unixTime: Date.now() / 1000,
            //   latitude: parsedData.latitude,
            //   longitude: parsedData.longitude,
            //   altitude: parsedData.altitude,
            //   count: count,
            // };
            // logger(logFilePath, formatedData)
          } catch (err) {
            console.error(`Request ${requestId}, Error parsing JSON:`, err);
          }
        }
      });
    }

    console.log(`Request ${requestId}: Stream completed, received ${count} chunks.`);
  } catch (error) {
    console.error(`Request ${requestId}: Error occurred -`, error.message);
  } finally {
    const endTime = Date.now() / 1000;
    controller.abort();
    const data = {
        id: requestId,
        startTime,
        endTime,
        span: endTime-startTime,
        count,
      };
    totalLogger(totalLogFilePath, data)
  }
};

// 同時リクエストを送信
(async () => {
  const promises = [];
  for (let i = 1; i <= numRequests; i++) {
    promises.push(fetchLiveStream(i));
  }

  await Promise.all(promises);
  console.log('All requests completed.');
})();
