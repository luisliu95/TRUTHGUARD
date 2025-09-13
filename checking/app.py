import os
import json
from flask import Flask, request, jsonify, send_from_directory, render_template_string, render_template
import requests

ARK_BASE = os.environ.get('ARK_BASE', 'https://ark.cn-beijing.volces.com/api/v3/chat/completions')
ARK_API_KEY = os.environ.get('ARK_API_KEY', '')

app = Flask(__name__, template_folder='templates')

@app.after_request
def add_cors(resp):
    resp.headers['Access-Control-Allow-Origin'] = os.environ.get('CORS_ALLOW_ORigin', '*')
    resp.headers['Access-Control-Allow-Headers'] = 'Content-Type, Authorization'
    resp.headers['Access-Control-Allow-Methods'] = 'GET,POST,OPTIONS'
    return resp

@app.route('/')
def index():
    return render_template('index.html')

@app.route('/<path:filename>')
def serve_static(filename):
    try:
        # 首先尝试从根目录加载文件（用于JavaScript、CSS等）
        return send_from_directory('.', filename)
    except FileNotFoundError:
        try:
            # 如果根目录找不到，尝试从templates目录加载
            return send_from_directory('templates', filename)
        except FileNotFoundError:
            return "文件未找到", 404

@app.route('/api/health', methods=['GET'])
def health():
    return jsonify({'ok': True, 'service': 'truthguard-flask', 'base': ARK_BASE})

@app.route('/api/chat', methods=['POST', 'OPTIONS'])
def chat():
    if request.method == 'OPTIONS':
        return ('', 204)

    data = request.get_json(silent=True) or {}
    model = data.get('model')
    messages = data.get('messages')
    api_key = (request.headers.get('Authorization') or '').replace('Bearer ', '') or ARK_API_KEY
    if not api_key:
        return jsonify({'error': {'message': 'Missing ARK_API_KEY'}}), 400
    if not model or not messages:
        return jsonify({'error': {'message': 'Missing model or messages'}}), 400

    # Add system prompt to messages if not already present
    system_prompt = """仅输出 JSON，且字段固定如下，不要输出多余文本、前后缀或代码块围栏：
{
  "conclusion": "string",
  "verdict": "true|partial|false|unknown",
  "confidence": 0-100,
  "evidence": [
    {"source": "string", "url": "string", "excerpt": "string"}
  ],
  "reasoning": "string"
}

规范要求：
- conclusion：将用户的问题改写为肯定句结论，例如：
  - 如果用户问"吃西瓜可以减肥吗"，conclusion应为"吃西瓜可以减肥"
  - 如果用户问"吃一碗螺蛳粉等于吃了18块大肥肉是真的吗"，conclusion应为"吃一碗螺蛳粉等于吃了18块大肥肉是假的"
  - 如果用户问"这个说法对吗"，conclusion应为"这个说法是对的"或"这个说法是错的"
- verdict 取值说明：
  - true：结论为真；
  - partial：部分为真或条件成立；
  - false：结论为假；
  - unknown：无法证伪/证实或证据不足。
- confidence：给 0–100 的整数，代表对判断的确信程度：
  - 如果verdict为true且证据充分，confidence应≥80（表示确信这是真的）
  - 如果verdict为false且证据充分，confidence应≥80（表示确信这是假的）
  - 如果verdict为partial，confidence应在60-80之间（表示部分确信）
  - 如果verdict为unknown，confidence应≤60（表示不确定）
  - 注意：confidence高表示对判断的确信度高，无论verdict是true还是false
- evidence：
  - 列出 1–5 条可核查来源，优先权威机构/主流媒体/学术来源；
  - 每条含可点击的完整 URL（http/https），并给一句话摘要 excerpt；
  - 如确无可靠来源，用空数组 []；不要放搜索结果页或失效链接。
- reasoning：用 30–120 字中文，概括关键判断链条，不重复 evidence 摘要，不输出列表。
- 多模态输入（含图片）时，先描述关键信息，再执行事实核查；若图片不足以支撑判断，应将 verdict 置为 unknown。
- 内容安全：如命题涉及健康/财经/法律/安全等高风险领域，优先引用权威来源；若无法确认，降低 confidence 并标记 unknown。

错误与不确定性处理：
- 无法解析问题或信息缺失时，verdict=unknown，confidence≤50，evidence=[]，reasoning 指明缺失点与需补充的信息类型。
- 不要输出"可能/建议/免责声明"等段落到 JSON 之外；所有解释均进入 reasoning。"""

    # Check if system message already exists
    has_system = any(msg.get('role') == 'system' for msg in messages)
    if not has_system:
        # Insert system prompt at the beginning
        messages.insert(0, {'role': 'system', 'content': system_prompt})

    try:
        res = requests.post(
            ARK_BASE,
            headers={'Authorization': f'Bearer {api_key}', 'Content-Type': 'application/json'},
            data=json.dumps({'model': model, 'messages': messages}),
            timeout=int(os.environ.get('ARK_TIMEOUT', '30'))
        )
        content_type = res.headers.get('Content-Type', '')
        # transparently pass through json or return text
        if 'application/json' in content_type:
            return (res.text, res.status_code, {'Content-Type': 'application/json'})
        else:
            try:
                _ = res.json()
                return (res.text, res.status_code, {'Content-Type': 'application/json'})
            except Exception:
                return jsonify({'raw': res.text}), res.status_code
    except requests.Timeout:
        return jsonify({'error': {'message': 'Upstream timeout'}}), 504
    except Exception as e:
        return jsonify({'error': {'message': str(e)}}), 500

if __name__ == '__main__':
    app.run(host='0.0.0.0', port=int(os.environ.get('PORT', '8000')), debug=True)