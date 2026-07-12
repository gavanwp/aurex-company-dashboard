// Public surface of modules/finance (13_Folder_Structure.md §3). Pages reach the
// finance module only through this file. NOTE: getFinanceOverview + FinanceSnapshot
// are exported for reuse by the dashboard / any snapshot widget.

export { FinanceOverview } from './components/finance-overview'
export { InvoicesList } from './components/invoices-list'
export { InvoiceDetailView } from './components/invoice-detail'
export { InvoiceForm } from './components/invoice-form'
export { ExpensesList } from './components/expenses-list'

export {
  getExpenses,
  getFinanceFormOptions,
  getFinanceOverview,
  getInvoice,
  getInvoiceNumbers,
  getInvoices,
  getNextInvoiceNumber,
  type GetExpensesFilters,
  type GetInvoicesFilters,
} from './queries/get-finance'

export { canManageFinance, canViewFinance } from './actions/finance-access'

export {
  isExpenseStatusTab,
  isInvoiceStatusTab,
  type ExpenseRow,
  type ExpenseStatusTab,
  type FinanceFormOptions,
  type FinanceOption,
  type FinanceSnapshot,
  type InvoiceDetail,
  type InvoiceListRow,
  type InvoiceStatusTab,
  type PaymentRow,
} from './types'
