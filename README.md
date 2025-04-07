# stun-mcp
STUN(RFC8489)のBinding Requestを送って結果を返すMCPサーバー

> [!WARNING]
> STUNのパケットの処理は必要最低限のものしか実装していません

## 利用方法

- Agentモードを有効化したVS Codeでの設定方法です
- mcp.jsonに以下の設定を追加します

```json
{
    "servers": {
       "stun": {
            "type": "stdio",
            "command": "node",
            "args": [
                "/path/to/stun-mcp/build/main.js"
            ]
        },
    }
}
```

- 以下のようなプロンプトを実行すると、STUNのリクエストが送られ、結果が表示されます
  > 以下のURLにSTUNのリクエストを送り、結果を出力してください
  >
  > stun:stun1.l.google.com:19302
