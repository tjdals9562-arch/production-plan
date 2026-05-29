/**
 * 다단계 BOM 전개 알고리즘
 *
 * bomList 구조: [{ asyCode, name, items: [{ code, name, spec, qty }] }]
 *
 * items 안의 code가 다른 BOM의 asyCode와 일치하면 → 서브어셈블리 (재귀 전개)
 * 일치하지 않으면 → 원자재 (leaf)
 */

// ─── 1. BOM 계층 트리 생성 ───────────────────────────────────────────
export function buildBOMTree(rootCode, rootQty, bomList, depth = 0, visited = new Set()) {
  const key = rootCode.toUpperCase()

  // 순환참조 방지
  if (visited.has(key)) {
    return { code: rootCode, name: rootCode, qty: rootQty, depth, isError: true, error: '순환참조 감지' }
  }

  const bom = bomList.find(b => b.asyCode.toUpperCase() === key)

  if (!bom) {
    // 원자재 (leaf node)
    return { code: rootCode, name: rootCode, qty: rootQty, depth, isLeaf: true }
  }

  const newVisited = new Set(visited)
  newVisited.add(key)

  return {
    code: rootCode,
    name: bom.name || rootCode,
    qty: rootQty,
    depth,
    isAssembly: true,
    children: bom.items.map(item =>
      buildBOMTree(item.code, rootQty * item.qty, bomList, depth + 1, newVisited)
    ).map((node, i) => ({
      ...node,
      // 원래 BOM item의 name/spec 정보 보완
      name: node.name === node.code ? (bom.items[i]?.name || node.code) : node.name,
      spec: bom.items[i]?.spec || node.spec || '',
      unitQty: bom.items[i]?.qty,  // 부모 1개당 수량
    })),
  }
}

// ─── 2. 원자재 소요량 집계 (flat) ─────────────────────────────────────
// 최하위 원자재만 합산. 중간 어셈블리는 제외.
export function explodeMaterials(rootCode, rootQty, bomList) {
  const materials = {}  // code → { code, name, spec, totalQty }

  function recurse(code, multiplier) {
    const key = code.toUpperCase()
    const bom = bomList.find(b => b.asyCode.toUpperCase() === key)

    if (!bom) {
      // 원자재 → 누적
      if (!materials[key]) materials[key] = { code, name: code, spec: '', totalQty: 0 }
      materials[key].totalQty += multiplier
      return
    }

    // 서브어셈블리 → 재귀
    for (const item of bom.items) {
      // name/spec 보완
      if (materials[item.code?.toUpperCase()]) {
        if (item.name) materials[item.code.toUpperCase()].name = item.name
        if (item.spec) materials[item.code.toUpperCase()].spec = item.spec
      }
      recurse(item.code, multiplier * (item.qty || 1))
    }
  }

  recurse(rootCode, rootQty)

  // name/spec은 BOM items에서 보완
  const allItems = {}
  bomList.forEach(bom => {
    bom.items.forEach(item => {
      if (item.code && !allItems[item.code.toUpperCase()]) {
        allItems[item.code.toUpperCase()] = { name: item.name, spec: item.spec }
      }
    })
  })
  Object.keys(materials).forEach(key => {
    if (allItems[key]) {
      if (!materials[key].name || materials[key].name === materials[key].code) materials[key].name = allItems[key].name || key
      if (!materials[key].spec) materials[key].spec = allItems[key].spec || ''
    }
  })

  return Object.values(materials).sort((a, b) => a.code.localeCompare(b.code))
}

// ─── 3. 여러 수주 동시 전개 (MPS → MRP) ─────────────────────────────
// orders: [{ asyCode, qty }]
export function explodeMultipleOrders(orders, bomList) {
  const combined = {}

  orders.forEach(order => {
    const materials = explodeMaterials(order.asyCode, order.qty, bomList)
    materials.forEach(m => {
      const key = m.code.toUpperCase()
      if (!combined[key]) combined[key] = { ...m, totalQty: 0, sources: [] }
      combined[key].totalQty += m.totalQty
      combined[key].sources.push({ asyCode: order.asyCode, qty: m.totalQty })
    })
  })

  return Object.values(combined).sort((a, b) => a.code.localeCompare(b.code))
}

// ─── 4. 순소요량 계산 (총소요 - 재고 = 발주필요) ────────────────────
// stockList: [{ code, qty }]
export function calcNetRequirements(materials, stockList) {
  const stockMap = {}
  stockList.forEach(s => { stockMap[s.code?.toUpperCase()] = s.qty || 0 })

  return materials.map(m => {
    const stock = stockMap[m.code?.toUpperCase()] || 0
    const net = Math.max(0, m.totalQty - stock)
    return {
      ...m,
      stock,
      net,
      sufficient: net === 0,
    }
  })
}
