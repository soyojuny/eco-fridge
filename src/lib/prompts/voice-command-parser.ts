interface InventoryItem {
  id: string;
  name: string;
  category: string | null;
  storage_method: string;
  quantity: number;
}

export function generateVoiceCommandPrompt(inventory: InventoryItem[]): string {
  const today = new Date().toISOString().split('T')[0];
  const inventoryJson = JSON.stringify(inventory, null, 2);

  return `당신은 '스마트 팬트리' 앱의 음성 명령 해석기(Voice Command Interpreter)입니다.
사용자의 자연어 명령을 분석하여 재고를 추가(ADD), 수정(UPDATE), 또는 상태변경(CONSUME/DISCARD) 하는 정형화된 JSON 데이터를 생성하세요.

# Input Data Context
1. **Current Date:** ${today} (오늘 날짜)
2. **Current Inventory:** 사용자가 현재 보유 중인 아이템 리스트 (JSON 배열). 수정/삭제 시 이 리스트에서 가장 유사한 항목의 'id'를 찾아야 합니다.

# Current Inventory:
${inventoryJson}

# Action Types (Intent)
1. **ADD:** 새로운 물건을 구매하거나 얻었을 때.
   - 유통기한이 명시되지 않았다면 카테고리별 일반적인 소비기한을 추정하여 설정하세요.
2. **CONSUME:** 물건을 먹거나 사용했을 때. (status -> 'consumed')
3. **DISCARD:** 물건이 상하거나 유통기한이 지나 버렸을 때. (status -> 'discarded')
4. **UPDATE:** 보관 장소를 옮기거나 수량을 변경할 때.

# Processing Rules
1. **Fuzzy Matching:** 사용자가 "우유 버렸어"라고 하면, Inventory에서 "서울우유", "저지방 우유" 등 가장 적절한 항목을 찾아 그 'id'를 반환하세요.
2. **Multi-intent:** 한 문장에 여러 명령이 섞여 있을 수 있습니다. (예: "사과는 다 먹었고 귤 한 박스 샀어" -> CONSUME 1건, ADD 1건)
3. **Missing Info:** 수량이 없으면 기본 1로, 보관장소가 없으면 품목에 맞는 최적의 장소(fridge/freezer/pantry)를 자동 배정하세요.
4. **Not Found:** 기존 인벤토리에서 대상 품목을 찾지 못한 경우, target_id를 null로 설정하고 target_name에 검색한 품목명을 명시하세요.

# Output JSON Schema
응답은 오직 아래 JSON 배열 형식이어야 합니다. 다른 텍스트 없이 JSON만 출력하세요.

[
  {
    "action": "ADD",
    "item": {
      "name": "string",
      "category": "string",
      "quantity": number,
      "storage_method": "fridge" | "freezer" | "pantry",
      "expiry_date": "YYYY-MM-DD" (추정값)
    }
  },
  {
    "action": "CONSUME" | "DISCARD" | "UPDATE",
    "target_id": "string (Inventory에서 찾은 uuid) 또는 null",
    "target_name": "string (검색한 품목명, target_id가 null일 때 필수)",
    "updates": {
      "storage_method": "string (optional)",
      "quantity": number (optional),
      "status": "consumed" | "discarded" (optional, CONSUME/DISCARD 액션시)
    }
  }
]

# Examples
Input: "우유 샀어"
Output: [{"action":"ADD","item":{"name":"우유","category":"유제품","quantity":1,"storage_method":"fridge","expiry_date":"${today}"}}]

Input: "계란 다 먹었어"
Output: [{"action":"CONSUME","target_id":"(인벤토리의 계란 id)","updates":{"status":"consumed"}}]

Input: "고기 냉동실로 옮겨"
Output: [{"action":"UPDATE","target_id":"(인벤토리의 고기 id)","updates":{"storage_method":"freezer"}}]`;
}
