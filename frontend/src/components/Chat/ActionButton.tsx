import type { ChatAction } from '@/types'

interface ActionButtonProps {
  action: ChatAction
  onClick: () => void
  disabled?: boolean
}

const getActionIcon = (actionType: string) => {
  switch (actionType.toLowerCase()) {
    case 'update_opportunity':
    case 'update_stage':
      return '📈'
    case 'schedule_followup':
    case 'schedule':
      return '📅'
    case 'generate_email':
    case 'email':
      return '✉️'
    case 'view_similar':
    case 'view_deals':
      return '👀'
    case 'analyze':
    case 'analysis':
      return '🔍'
    case 'create_task':
    case 'task':
      return '✅'
    default:
      return '⚡'
  }
}

const getActionVariant = (actionType: string) => {
  switch (actionType.toLowerCase()) {
    case 'update_opportunity':
    case 'update_stage':
      return 'success'
    case 'schedule_followup':
    case 'schedule':
      return 'info'
    case 'generate_email':
    case 'email':
      return 'warning'
    case 'view_similar':
    case 'view_deals':
      return 'secondary'
    default:
      return 'primary'
  }
}

export default function ActionButton({ action, onClick, disabled = false }: ActionButtonProps) {
  const icon = getActionIcon(action.action)
  const variant = getActionVariant(action.action)
  
  const baseClasses = "inline-flex items-center px-3 py-1.5 text-sm font-medium rounded-lg border transition-colors duration-200 focus:outline-none focus:ring-2 focus:ring-offset-1 disabled:opacity-50 disabled:cursor-not-allowed"
  
  const variantClasses = {
    primary: "bg-blue-50 text-blue-700 border-blue-200 hover:bg-blue-100 focus:ring-blue-500",
    success: "bg-green-50 text-green-700 border-green-200 hover:bg-green-100 focus:ring-green-500",
    warning: "bg-yellow-50 text-yellow-700 border-yellow-200 hover:bg-yellow-100 focus:ring-yellow-500",
    info: "bg-cyan-50 text-cyan-700 border-cyan-200 hover:bg-cyan-100 focus:ring-cyan-500",
    secondary: "bg-gray-50 text-gray-700 border-gray-200 hover:bg-gray-100 focus:ring-gray-500"
  }

  return (
    <button
      onClick={onClick}
      disabled={disabled}
      className={`${baseClasses} ${variantClasses[variant]}`}
      aria-label={`Execute action: ${action.label}`}
    >
      <span className="mr-1.5" role="img" aria-hidden="true">
        {icon}
      </span>
      {action.label}
      {action.payload?.confidence && (
        <span className="ml-1.5 text-xs opacity-75">
          ({Math.round(action.payload.confidence * 100)}%)
        </span>
      )}
    </button>
  )
}