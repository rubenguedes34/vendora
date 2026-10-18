# AI support chat

Routes (`permission:use ai support`): `POST /api/ai/chat` (`throttle:ai`), `GET /api/ai/faqs`,
`GET|DELETE /api/ai/conversations[/{uuid}]`. Frontend: `AiSupportComponent`.

## How a message is answered (`AiChatController::chat`)

1. Pick the provider (`supportProvider`): `config('ai.support.provider')` (`ollama` | `openai`), or `openai` when
   an OpenAI key exists, else none.
2. **No provider -> local FAQ answer** (`localResponse`): greeting, best keyword-matching FAQ, or a list of
   suggested questions. No LLM involved.
3. With a provider: validate `conversation_id` belongs to the user (404 otherwise), take up to 3 models from
   `config('ai.support.models')`, and try them in order with `SupportAgent`. If every model throws, fall back
   to the local FAQ answer.

## SupportAgent

- Prompt = fixed instructions + the 3 most relevant FAQs (keyword scoring in `relevantFaqs`). It is told to
  describe only features in the reference. Replies in pt-PT when the app locale is `pt`.
- Context is capped at 6 messages and 3 FAQs because prompt size drives latency on CPU-only (Ollama) models.
- `set_time_limit` is raised to `timeout x models + 15` (`ai.support.timeout`, env `AI_SUPPORT_TIMEOUT`,
  default 45 s) so a cold local model is not killed at 30 s; keep the worst case below the SPA's request timeout.
- Ollama has no default model: empty `AI_SUPPORT_MODELS` means "not configured" (logs a warning, falls back).
  With OpenAI and no models configured, one attempt is made with the SDK's default model.

## Data

- FAQs: `Faq` model (localized question/answer + `keywords`), managed in the Filament admin. A FAQ with no
  keywords is skipped (an empty regex would match everything). Keywords are lowercased before matching.
- Conversations come from `laravel/ai`'s `Conversation` store and are filtered by participant (the user);
  list returns the 50 most recent; deleting removes messages and the conversation in one transaction.
- Daily limit per user: `config('ai.support.daily_limit')` (default 100) + 10/min, in the `ai` limiter.

Keep FAQs in sync with real features: the assistant only knows what the FAQs say.
