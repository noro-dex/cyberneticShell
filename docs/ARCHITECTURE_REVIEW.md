# Architecture Review: Tauri + WebSocket/REST Support

## Current Architecture Overview

The application supports two deployment modes:

1. **Tauri Mode**: Desktop app using Tauri commands (`src-tauri/`)
2. **Web Mode**: Web app using REST API + WebSocket (`src-server/`)

## Current Implementation Status

### ✅ What's Working Well

1. **API Abstraction Layer** (`src/utils/api.ts`)
   - Dual-mode support with `isTauri` detection
   - All REST endpoints implemented for web mode
   - WebSocket connection logic in place
   - Tauri commands properly abstracted

2. **Server Implementation** (`src-server/`)
   - All REST endpoints match Tauri command functionality
   - WebSocket handler properly broadcasts events
   - CORS configured for web access
   - Static file serving for frontend

3. **Event System**
   - Unified event handling via `useTauriEvents` hook
   - Events work in both Tauri and Web modes
   - Proper event type definitions

### ⚠️ Issues & Improvements Needed

#### 1. **Misleading Hook Name**
- **File**: `src/hooks/useTauriEvents.ts`
- **Issue**: Name suggests Tauri-only, but it works for both modes
- **Recommendation**: Rename to `useAgentEvents` or `useEventStream`

#### 2. **WebSocket Connection Management**
- **File**: `src/utils/api.ts`
- **Issues**:
  - Connection retry logic could be more robust
  - No connection state tracking for UI feedback
  - WebSocket might not reconnect properly after network issues
  - No handling for server disconnection scenarios

#### 3. **Error Handling**
- **Issues**:
  - Some API calls don't have comprehensive error handling
  - WebSocket errors are logged but not surfaced to users
  - Network failures in web mode need better UX

#### 4. **Type Safety**
- **Issue**: Some API responses might not be properly typed
- **Recommendation**: Ensure all API responses match TypeScript types

#### 5. **Environment Configuration**
- **File**: `src/utils/env.ts`
- **Issue**: `VITE_API_URL` might not be set in all environments
- **Recommendation**: Add better fallback logic and validation

#### 6. **WebSocket Message Parsing**
- **File**: `src/utils/api.ts`
- **Issue**: No validation that parsed messages match `AgentEvent` type
- **Recommendation**: Add runtime validation using `isAgentEvent` helper

## API Endpoint Mapping

### REST API ↔ Tauri Commands

| REST Endpoint | Tauri Command | Status |
|--------------|---------------|--------|
| `POST /api/agents` | `start_agent` | ✅ Matched |
| `DELETE /api/agents/:id` | `stop_agent` | ✅ Matched |
| `DELETE /api/agents/all` | `stop_all_agents` | ✅ Matched |
| `GET /api/agents` | `list_agents` | ✅ Matched |
| `GET /api/cli/check/:cli` | `check_*_cli_available` | ✅ Matched |
| `GET /api/skills` | `list_skills` | ✅ Matched |
| `GET /api/skills/:name` | `get_skill` | ✅ Matched |
| `WS /ws` | Tauri events | ✅ Matched |

## Recommended Improvements

### Priority 1: Critical Fixes

1. **Rename `useTauriEvents` hook** to `useAgentEvents`
2. **Improve WebSocket reconnection logic** with exponential backoff
3. **Add connection state tracking** for UI feedback
4. **Add message validation** for WebSocket events

### Priority 2: Enhancements

1. **Better error handling** with user-friendly messages
2. **Connection status indicator** in UI
3. **Retry logic** for failed API calls
4. **Environment variable validation** on startup

### Priority 3: Nice to Have

1. **Connection health monitoring**
2. **Automatic reconnection UI feedback**
3. **API call timeout handling**
4. **Request/response logging** in dev mode

## Code Quality Notes

### Strengths
- Clean separation of concerns
- Good abstraction layer design
- TypeScript types are well-defined
- Zustand stores are well-structured

### Areas for Improvement
- Some async/await patterns could be simplified
- Error messages could be more descriptive
- WebSocket connection lifecycle needs better management

## Testing Recommendations

1. **Test WebSocket reconnection** after network interruption
2. **Test API calls** with server unavailable
3. **Test event handling** in both Tauri and Web modes
4. **Test error scenarios** (invalid responses, network failures)
5. **Test concurrent agent operations** in web mode

## Migration Path (if needed)

If significant refactoring is needed:
1. Start with hook renaming (non-breaking if done carefully)
2. Improve WebSocket connection management
3. Add connection state tracking
4. Enhance error handling incrementally
