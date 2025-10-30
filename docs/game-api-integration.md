# 游戏API集成文档

## 概述

本项目已集成游戏API服务，提供以下功能：
- 创建玩家
- 获取玩家资料
- 存款/取款
- 投注登录
- 投注大厅
- 投注列表
- 投注历史
- 中奖号码
- 开奖结果
- 更新玩家状态/密码

## API接口列表

### 1. 创建玩家
- **URL**: `POST /game-api/create-player`
- **权限**: 需要JWT认证
- **参数**:
  ```json
  {
    "loginId": "player123",
    "loginPass": "password123",
    "fullName": "Player Name",
    "email": "player@example.com"  // 可选
  }
  ```

### 2. 获取玩家资料
- **URL**: `GET /game-api/profile?loginId=player123`
- **权限**: 需要JWT认证

### 3. 存款
- **URL**: `POST /game-api/deposit`
- **权限**: 需要JWT认证
- **参数**:
  ```json
  {
    "loginId": "player123",
    "amount": 100,
    "reference": "deposit-001"
  }
  ```

### 4. 取款
- **URL**: `POST /game-api/withdraw`
- **权限**: 需要JWT认证
- **参数**:
  ```json
  {
    "loginId": "player123",
    "amount": 50,
    "reference": "withdraw-001"
  }
  ```

### 5. 投注登录
- **URL**: `POST /game-api/bet-login`
- **权限**: 需要JWT认证
- **参数**:
  ```json
  {
    "loginId": "player123",
    "loginPass": "password123"
  }
  ```

### 6. 投注大厅
- **URL**: `GET /game-api/bet-lobby`
- **权限**: 需要JWT认证

### 7. 投注列表
- **URL**: `GET /game-api/bet-list?loginId=player123&gameType=lottery&date=2024-01-01`
- **权限**: 需要JWT认证

### 8. 分页投注列表
- **URL**: `GET /game-api/bet-list-by-page?loginId=player123&page=1&limit=10&gameType=lottery`
- **权限**: 需要JWT认证

### 9. 投注历史
- **URL**: `GET /game-api/bet-history?loginId=player123&startDate=2024-01-01&endDate=2024-01-31`
- **权限**: 需要JWT认证

### 10. 中奖号码
- **URL**: `GET /game-api/winning-number`
- **权限**: 需要JWT认证

### 11. 开奖结果
- **URL**: `GET /game-api/draw-result`
- **权限**: 需要JWT认证

### 12. 更新玩家状态/密码
- **URL**: `POST /game-api/update-player-status`
- **权限**: 需要JWT认证
- **参数**:
  ```json
  {
    "loginId": "player123",
    "status": "active",  // 可选：active, inactive, suspended
    "password": "newpassword123"  // 可选
  }
  ```

## 配置说明

在 `src/secret/secret-dev.ts` 文件中添加以下配置：

```typescript
export const GAME_API_CONFIG = {
  url: 'http://your-game-api-url',        // 游戏API基础URL
  apiUser: 'your-api-user',               // API用户名
  apiPass: 'your-api-password',           // API密码
  user: 'your-user',                      // 用户账号
  pass: 'your-password',                  // 用户密码
};
```

## 使用示例

### 服务端调用

```typescript
import gameApiService from '@/service/gameApi.service';

// 创建玩家
const result = await gameApiService.createPlayer({
  loginId: 'player123',
  loginPass: 'password123',
  fullName: 'Player Name'
});

// 获取玩家资料
const profile = await gameApiService.getProfile({
  loginId: 'player123'
});

// 存款
const deposit = await gameApiService.deposit({
  loginId: 'player123',
  amount: 100,
  reference: 'deposit-001'
});
```

### 前端调用

```javascript
// 创建玩家
const createPlayer = async () => {
  const response = await fetch('/game-api/create-player', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token}`
    },
    body: JSON.stringify({
      loginId: 'player123',
      loginPass: 'password123',
      fullName: 'Player Name'
    })
  });
  return response.json();
};

// 获取玩家资料
const getProfile = async (loginId) => {
  const response = await fetch(`/game-api/profile?loginId=${loginId}`, {
    headers: {
      'Authorization': `Bearer ${token}`
    }
  });
  return response.json();
};
```

## 错误处理

所有API返回统一的错误格式：

```json
{
  "code": 400,
  "message": "参数错误",
  "data": null
}
```

## 注意事项

1. 所有接口都需要JWT认证
2. 金额单位由游戏API决定（通常为分或元）
3. 确保配置的API地址正确且网络可达
4. 建议在生产环境中使用HTTPS
5. 定期更新API密钥以保证安全性

## 测试

启动项目后，可以通过以下方式测试API：

```bash
# 启动开发环境
npm run dev

# 测试创建玩家接口
curl -X POST http://localhost:4300/game-api/create-player \
  -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"loginId":"test123","loginPass":"123456","fullName":"Test User"}'
```