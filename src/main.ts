import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { z } from "zod";
import dgram from "dgram";

// Create an MCP server
const server = new McpServer({
  name: "STUN MCP Server",
  version: "1.0.0",
});

// Add an addition tool
server.tool(
  "stun_request",
  "STUNのリクエストを送り、レスポンスを返す",
  { url: z.string().default("stun:stun1.l.google.com:19302") },
  async ({ url }) => {
    const [_, address, port] = url.split(":");
    const stunAddress = address || "stun1.l.google.com";
    const stunPort = Number(port) || 19302;

    const stunResponse = await sendStunRequest(stunAddress, stunPort);

    return {
      content: [{ type: "text", text: JSON.stringify(stunResponse) || "No response received" }],
    };
  }
);

// Function to send a STUN request and log the response
// ref: https://webrtcforthecurious.com/docs/09-debugging/#networking-failure
async function sendStunRequest(stunAddress: string, stunPort: number) {
  const listenPort = 20000;
  const message = Buffer.from("\x00\x01\x00\x00\x21\x12\xA4\x42TESTTESTTEST", "binary");

  const socket = dgram.createSocket("udp4");

  return new Promise<{ port: number; ip: string | undefined }>((resolve, reject) => {
    socket.on("message", (msg) => {
      // msgはSTUNのXOR-MAPPED-ADDRESSを含むレスポンスであるため、これをパースして送信元のIPアドレスとポートを取得する
      // ref: https://sublimer.hatenablog.com/entry/2021/12/12/000000
      // STUNのヘッダは20バイトのため、それ以降を抽出
      const payload = Buffer.from(msg.subarray(20));
      // portは6、7バイト目、ipは8-11バイト目に格納されている

      // マジッククッキーの取得
      const magicCookie = 0x2112A442;

      // ポート番号をパース（XOR処理）
      const xorPort = payload.readUInt16BE(6) ^ (magicCookie >> 16);

      // IPアドレスをパース（XOR処理）
      const xorIp1 = payload.readUInt8(8) ^ (magicCookie >> 24);
      const xorIp2 = payload.readUInt8(9) ^ ((magicCookie >> 16) & 0xFF);
      const xorIp3 = payload.readUInt8(10) ^ ((magicCookie >> 8) & 0xFF);
      const xorIp4 = payload.readUInt8(11) ^ (magicCookie & 0xFF);

      // IPアドレスを文字列として結合
      const ip = `${xorIp1}.${xorIp2}.${xorIp3}.${xorIp4}`;

      socket.close();
      resolve({
        port: xorPort,
        ip,
      });
    });

    socket.on("error", (err) => {
      console.error("Socket error:", err);
      socket.close();
      reject(err);
    });

    socket.bind(listenPort, () => {
      socket.send(message, 0, message.length, stunPort, stunAddress, (err) => {
        if (err) {
          console.error("Failed to send message:", err);
          socket.close();
        }
      });
    });
  });
}

// Start receiving messages on stdin and sending messages on stdout
const transport = new StdioServerTransport();
await server.connect(transport);
