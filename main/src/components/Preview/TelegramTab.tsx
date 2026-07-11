import s from './Tabs.module.css'

interface Message {
  from: string
  text: string
}

interface TelegramTabProps {
  messages: Message[]
  inputPlaceholder: string
}

export default function TelegramTab({ messages, inputPlaceholder }: TelegramTabProps) {
  return (
    <div className={s.tg}>
      <div className={s.tgHeader}>
        <div className={s.tgBot}>
          <span className={s.tgBotIcon}>🤖</span>
          <div>
            <p className={s.tgBotName}>Life OS Bot</p>
            <p className={s.tgBotStatus}>online</p>
          </div>
        </div>
      </div>

      <div className={s.tgMessages}>
        {messages.map((msg, i) => (
          <div
            key={i}
            className={`${s.tgMsg} ${msg.from === 'user' ? s.tgMsgUser : s.tgMsgBot}`}
          >
            {msg.text}
          </div>
        ))}
      </div>

      <div className={s.tgInput}>
        <span>{inputPlaceholder}</span>
        <button className={s.tgSend}>➤</button>
      </div>
    </div>
  )
}
