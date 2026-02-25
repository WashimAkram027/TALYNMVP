export default function PaymentSetupPrompt() {
  return (
    <div className="space-y-4">
      <div className="flex items-start gap-3 p-4 bg-gray-50 dark:bg-gray-800/50 rounded-lg border border-border-light dark:border-border-dark">
        <div className="flex-shrink-0 h-10 w-10 rounded-lg bg-purple-100 dark:bg-purple-900/30 flex items-center justify-center text-purple-600 dark:text-purple-400">
          <span className="material-icons-outlined text-xl">account_balance</span>
        </div>
        <div className="flex-1">
          <h4 className="text-sm font-medium text-text-light dark:text-text-dark">
            Connect your US bank account to fund payroll
          </h4>
          <p className="text-xs text-subtext-light dark:text-subtext-dark mt-1">
            Securely link your bank account to enable payroll processing for your team in Nepal.
            We use bank-level encryption to protect your financial data.
          </p>
        </div>
      </div>

      <div className="flex items-center gap-3">
        <button
          disabled
          className="px-5 py-2 bg-primary text-white rounded-lg text-sm font-medium shadow-sm opacity-50 cursor-not-allowed flex items-center gap-2"
        >
          <span className="material-icons-outlined text-lg">link</span>
          Connect Bank Account
        </button>
        <span className="text-xs font-medium px-2.5 py-1 rounded-full bg-gray-100 dark:bg-gray-800 text-subtext-light dark:text-subtext-dark">
          Coming soon
        </span>
      </div>
    </div>
  )
}
