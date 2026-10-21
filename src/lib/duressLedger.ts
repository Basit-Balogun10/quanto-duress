import type { Transaction } from './types'

interface LedgerTemplate {
  counterparty: string
  bank: string
  accountNumber?: string
  description: string
  category: Transaction['category']
  daysAgo: number
  hoursAgo: number
  weight: number
}

const outgoing: LedgerTemplate[] = [
  {
    counterparty: 'Chicken Republic',
    bank: 'Card payment',
    description: 'Lunch with the team',
    category: 'food',
    daysAgo: 0,
    hoursAgo: 3,
    weight: 10,
  },
  {
    counterparty: 'Bolt',
    bank: 'Card payment',
    description: 'Ride to the office',
    category: 'transport',
    daysAgo: 1,
    hoursAgo: 2,
    weight: 6,
  },
  {
    counterparty: 'Mama Ngozi',
    bank: 'GTBank',
    accountNumber: '0123456789',
    description: 'Weekly support',
    category: 'transfer',
    daysAgo: 2,
    hoursAgo: 4,
    weight: 18,
  },
  {
    counterparty: 'GreenLife Pharmacy',
    bank: 'Card payment',
    description: 'Prescription refill',
    category: 'health',
    daysAgo: 3,
    hoursAgo: 1,
    weight: 7,
  },
  {
    counterparty: 'Shoprite',
    bank: 'Card payment',
    description: 'Weekly groceries',
    category: 'shopping',
    daysAgo: 4,
    hoursAgo: 5,
    weight: 20,
  },
  {
    counterparty: 'Tunde Bello',
    bank: 'Access Bank',
    accountNumber: '0987654321',
    description: 'Rent contribution',
    category: 'transfer',
    daysAgo: 5,
    hoursAgo: 2,
    weight: 22,
  },
  {
    counterparty: 'MTN Nigeria',
    bank: 'Bill payment',
    description: '10GB data plan',
    category: 'bills',
    daysAgo: 6,
    hoursAgo: 1,
    weight: 9,
  },
  {
    counterparty: 'Netflix',
    bank: 'Card payment',
    description: 'Monthly subscription',
    category: 'entertainment',
    daysAgo: 7,
    hoursAgo: 6,
    weight: 5,
  },
]

function daysAgo(days: number, hours: number) {
  return new Date(Date.now() - (days * 24 + hours) * 60 * 60 * 1000).toISOString()
}

function reference() {
  return `QX-${Math.random().toString(36).slice(2, 7).toUpperCase()}`
}

function monthName() {
  return new Intl.DateTimeFormat('en-NG', { month: 'long' }).format(new Date())
}

export function createDuressLedger(balance: number, monthlyBudget: number): Transaction[] {
  const decoyBalance = Math.max(0, Math.round(balance))
  const spendTarget =
    decoyBalance === 0
      ? Math.min(28000, Math.max(5000, Math.round(monthlyBudget * 0.7)))
      : Math.max(5000, Math.min(Math.round(decoyBalance * 0.55), Math.round(monthlyBudget * 0.7)))
  const totalWeight = outgoing.reduce((total, item) => total + item.weight, 0)
  let allocated = 0

  const spending = outgoing.map((template, index) => {
    const isLast = index === outgoing.length - 1
    const amount = isLast
      ? spendTarget - allocated
      : Math.max(250, Math.round((spendTarget * template.weight) / totalWeight))
    allocated += amount

    return {
      id: `duress_tx_${index + 1}`,
      direction: 'out' as const,
      amount,
      counterparty: template.counterparty,
      bank: template.bank,
      accountNumber: template.accountNumber,
      description: template.description,
      category: template.category,
      createdAt: daysAgo(template.daysAgo, template.hoursAgo),
      status: 'completed' as const,
      reference: reference(),
    }
  })

  const dinnerSplit = Math.max(2500, Math.round(spendTarget * 0.08))
  const salary = decoyBalance + spendTarget - dinnerSplit

  const incoming: Transaction[] = [
    {
      id: 'duress_tx_zara',
      direction: 'in',
      amount: dinnerSplit,
      counterparty: 'Zara Ahmed',
      bank: 'Kuda',
      accountNumber: '2233445566',
      description: 'Dinner split',
      category: 'transfer',
      createdAt: daysAgo(8, 3),
      status: 'completed',
      reference: reference(),
    },
    {
      id: 'duress_tx_salary',
      direction: 'in',
      amount: salary,
      counterparty: 'Salary',
      bank: 'Quanto',
      description: `${monthName()} salary`,
      category: 'income',
      createdAt: daysAgo(10, 1),
      status: 'completed',
      reference: reference(),
    },
  ]

  return [...spending, ...incoming].sort(
    (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime(),
  )
}
