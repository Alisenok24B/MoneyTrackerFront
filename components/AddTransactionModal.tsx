/* eslint-disable @typescript-eslint/no-unused-vars */
import { useEffect, useState } from 'react';
import { BackendTransaction } from '@/lib/core.types';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  RadioGroup,
  RadioGroupItem,
} from '@/components/ui/radio-group';
import { Calendar } from '@/components/ui/calendar';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import { Checkbox } from '@/components/ui/checkbox';
import { AlertTriangle, CalendarIcon } from 'lucide-react';
import { format, isAfter, parseISO } from 'date-fns';
import { cn } from '@/lib/utils';
import { getToken } from '@/utils/jwt';
import styles from './AddTransactionModal.module.css';

import {
    ShoppingCart,
    Car,
    Package,
    Banknote,
    ArrowRightLeft,
    Home,
} from 'lucide-react';

const CATEGORY_ICON_MAP: Record<string, React.ElementType> = {
    food: ShoppingCart,
    transport: Car,
    shopping: Package,
    salary: Banknote,
    rent: Home,
    transfer: ArrowRightLeft,
};

interface Account {
  _id: string;
  name: string;
  type: 'debit' | 'credit' | 'cash' | 'creditCard' | string;
}
interface Category {
  _id: string;
  name: string;
  type: 'income' | 'expense' | 'transfer' | string;
  icon?: string;
}
interface CreditPeriod {
  periodId: string;
  debt: number;
  statementStart: string;
  paymentDue: string;
  status: 'payment' | 'overdue';
}

interface AddTransactionModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onTransactionAdded?: (tx: BackendTransaction) => void;
}

export const AddTransactionModal = ({
  open,
  onOpenChange,
  onTransactionAdded,
}: AddTransactionModalProps) => {
  const [transactionType, setTransactionType] = useState<'income' | 'expense' | 'transfer'>('expense');
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [fromAccount, setFromAccount] = useState('');
  const [toAccount, setToAccount] = useState('');
  const [category, setCategory] = useState('');
  const [amount, setAmount] = useState('');
  const [date, setDate] = useState<Date>();
  const [description, setDescription] = useState('');
  const [creditPeriods, setCreditPeriods] = useState<CreditPeriod[]>([]);
  const [creditPeriod, setCreditPeriod] = useState('');
  const [payInterest, setPayInterest] = useState(false);
  const [loadingPeriods, setLoadingPeriods] = useState(false);
  const [showNoPeriodsBanner, setShowNoPeriodsBanner] = useState(false);

  const [, setCalendarOpen] = useState(false);

  // Верно определяем кредитку!
  const isCreditCard = (acc?: Account) => acc?.type === 'creditCard';

  useEffect(() => {
    if (!open) return;
    const fetchAccounts = async () => {
      const token = getToken();
      const res = await fetch('http://localhost:3333/api/accounts', {
        headers: token ? { Authorization: `Bearer ${token}` } : {},
      });
      if (!res.ok) return;
      const data = await res.json();
      setAccounts(data.accounts ?? []);
    };
    fetchAccounts();
  }, [open]);

  useEffect(() => {
    if (!open) return;
    const fetchCategories = async () => {
      const token = getToken();
      let type = transactionType;
      if (type === 'transfer') type = 'transfer';
      const res = await fetch(`http://localhost:3333/api/categories?type=${type}`, {
        headers: token ? { Authorization: `Bearer ${token}` } : {},
      });
      if (!res.ok) return;
      const data = await res.json();
      setCategories(data.categories ?? []);
      if (type === 'transfer' && data.categories?.length) {
        setCategory(data.categories[0]._id);
      } else {
        setCategory('');
      }
    };
    fetchCategories();
  }, [transactionType, open]);

  // --- Load Credit Periods ---
  useEffect(() => {
    setCreditPeriod('');
    setCreditPeriods([]);
    setPayInterest(false);
    setShowNoPeriodsBanner(false);

    let cardId = '';
    if (
      transactionType === 'income' &&
      isCreditCard(accounts.find(a => a._id === fromAccount))
    ) {
      cardId = fromAccount;
    } else if (
      transactionType === 'transfer' &&
      isCreditCard(accounts.find(a => a._id === toAccount))
    ) {
      cardId = toAccount;
    } else {
      return;
    }
    if (!cardId) return;

    setLoadingPeriods(true);
    const token = getToken();
    fetch(`http://localhost:3333/api/credit-cards/${cardId}/periods/debts`, {
      headers: token ? { Authorization: `Bearer ${token}` } : {},
    })
      .then(res => res.ok ? res.json() : Promise.reject())
      .then(data => {
        const periods = data.debts ?? [];
        setCreditPeriods(periods);
        if (periods.length > 0) {
          setCreditPeriod(periods[0].periodId); // выбрать первый период по умолчанию
          setShowNoPeriodsBanner(false);
        } else {
          setCreditPeriod('');
          setShowNoPeriodsBanner(true); // показать инфобаннер
        }
      })
      .catch(() => {
        setCreditPeriods([]);
        setCreditPeriod('');
        setShowNoPeriodsBanner(true);
      })
      .finally(() => setLoadingPeriods(false));
  }, [fromAccount, toAccount, transactionType, accounts]);

  useEffect(() => {
    if (open) {
      resetForm();
    }
  }, [open]);

  function resetForm() {
    setTransactionType('expense');
    setFromAccount('');
    setToAccount('');
    setCategory('');
    setAmount('');
    setDate(undefined);
    setDescription('');
    setCreditPeriods([]);
    setCreditPeriod('');
    setPayInterest(false);
    setCalendarOpen(false);
    setShowNoPeriodsBanner(false);
  }

  const isCreditTo = () => {
    if (transactionType === 'transfer') {
      return isCreditCard(accounts.find(a => a._id === toAccount));
    }
    if (transactionType === 'income') {
      return isCreditCard(accounts.find(a => a._id === fromAccount));
    }
    return false;
  };

  const shouldShowToAccount = () => transactionType === 'transfer';
  const shouldShowCreditPeriods = () => isCreditTo() && accounts.length > 0;
  const selectedCreditPeriod = creditPeriods.find(p => p.periodId === creditPeriod);

  const shouldShowInterestCheckbox = () => {
    if (!shouldShowCreditPeriods() || !selectedCreditPeriod || !date) return false;
    if (selectedCreditPeriod.status !== 'overdue') return false;
    if (isAfter(date, parseISO(selectedCreditPeriod.paymentDue))) return true;
    return false;
  };

  const renderPeriodLabel = (period: CreditPeriod) => {
    const start = format(parseISO(period.statementStart), 'dd.MM.yyyy');
    const end = format(parseISO(period.paymentDue), 'dd.MM.yyyy');
    const debt = period.debt ?? 0;
    return `${start} — ${end} | Долг: ${debt} ₽ (${period.status === 'overdue' ? 'просрочен' : 'к оплате'})`;
  };

  const handleSubmit = async () => {
    const token = getToken();
    const headers = {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    };
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    let body: any = {};
    const amountNumber = Number(amount);

    if (transactionType === 'income' || transactionType === 'expense') {
      body = {
        accountId: fromAccount,
        categoryId: category,
        amount: amountNumber,
        date: date ? format(date, 'yyyy-MM-dd') : undefined,
        description: description || undefined,
      };
      if (
        transactionType === 'income' &&
        isCreditCard(accounts.find(a => a._id === fromAccount))
      ) {
        body.periodId = creditPeriod;
        if (shouldShowInterestCheckbox()) {
          body.hasInterest = !!payInterest;
        }
      }
    }
    if (transactionType === 'transfer') {
      body = {
        accountId: fromAccount,
        toAccountId: toAccount,
        categoryId: category,
        amount: amountNumber,
        date: date ? format(date, 'yyyy-MM-dd') : undefined,
        description: description || undefined,
      };
      if (isCreditCard(accounts.find(a => a._id === toAccount))) {
        body.periodId = creditPeriod;
        if (shouldShowInterestCheckbox()) {
          body.hasInterest = !!payInterest;
        }
      }
    }
    if (shouldShowInterestCheckbox() && selectedCreditPeriod) {
      if (
        amountNumber <= selectedCreditPeriod.debt &&
        payInterest
      ) {
        alert(
          'Погашение процентов возможно только если сумма превышает долг.'
        );
        return;
      }
    }
    try {
      const res = await fetch('http://localhost:3333/api/transactions', {
        method: 'POST',
        headers,
        body: JSON.stringify(body),
      });
      if (!res.ok) throw new Error('Ошибка при добавлении');
      const tx = await res.json();
      onOpenChange(false);
      if (onTransactionAdded) onTransactionAdded(tx.transaction || tx);
    } catch (e) {
      alert('Не удалось добавить транзакцию');
    }
  };

  const handleClose = () => {
    resetForm();
    onOpenChange(false);
  };

  const submitDisabled = !fromAccount ||
    !transactionType ||
    (!category && transactionType !== 'transfer') ||
    !amount ||
    !date ||
    (shouldShowToAccount() && !toAccount) ||
    (shouldShowCreditPeriods() && !creditPeriod);

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className={styles.modalContent}>
        <DialogHeader className={styles.header}>
          <DialogTitle>Добавить операцию</DialogTitle>
        </DialogHeader>
        <div className={styles.formBlock}>
          <div className={styles.inputBlock}>
            <Label htmlFor="account" className={styles.label}>
              {transactionType === 'income'
                ? 'Счет зачисления'
                : 'Счет списания'}{' '}
              <span className={styles.labelRequired}>*</span>
            </Label>
            <Select value={fromAccount} onValueChange={setFromAccount}>
              <SelectTrigger className={styles.select}>
                <SelectValue placeholder="Выберите счет" />
              </SelectTrigger>
              <SelectContent>
                {accounts.map((account) => (
                  <SelectItem key={account._id} value={account._id}>
                    {account.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className={styles.inputBlock}>
            <Label className={styles.label}>
              Тип операции <span className={styles.labelRequired}>*</span>
            </Label>
            <RadioGroup
              value={transactionType}
              onValueChange={(value) => {
                setTransactionType(value as 'income' | 'expense' | 'transfer');
                setCategory('');
                setToAccount('');
                setCreditPeriod('');
              }}
              className={styles.radioGroup}
            >
              <div className={styles.flexRow}>
                <RadioGroupItem value="income" id="income" />
                <Label htmlFor="income">Доход</Label>
              </div>
              <div className={styles.flexRow}>
                <RadioGroupItem value="expense" id="expense" />
                <Label htmlFor="expense">Расход</Label>
              </div>
              <div className={styles.flexRow}>
                <RadioGroupItem value="transfer" id="transfer" />
                <Label htmlFor="transfer">Перевод</Label>
              </div>
            </RadioGroup>
          </div>
          {transactionType !== 'transfer' && (
            <div className={styles.inputBlock}>
              <Label htmlFor="category" className={styles.label}>
                Категория <span className={styles.labelRequired}>*</span>
              </Label>
              <Select value={category} onValueChange={setCategory}>
                <SelectTrigger className={styles.select}>
                  <SelectValue placeholder="Выберите категорию" />
                </SelectTrigger>
                <SelectContent>
                {categories.map((cat) => {
  const Icon = cat.icon && CATEGORY_ICON_MAP[cat.icon];
  return (
    <SelectItem key={cat._id} value={cat._id}>
  <span style={{
    display: "flex",
    alignItems: "center"
  }}>
    {Icon && (
      <Icon
        style={{
          width: "1.2em",
          height: "1.2em",
          marginRight: 9,
          color: "#97b3ea",
          flexShrink: 0,
        }}
      />
    )}
    <span style={{
      fontSize: "1em",
      fontWeight: 500,
      overflow: "hidden",
      textOverflow: "ellipsis",
      whiteSpace: "nowrap",
      lineHeight: 1.13
    }}>
      {cat.name}
    </span>
  </span>
</SelectItem>
  );
})}
                </SelectContent>
              </Select>
            </div>
          )}
          {shouldShowToAccount() && (
            <div className={styles.inputBlock}>
              <Label htmlFor="toAccount" className={styles.label}>
                Счет назначения <span className={styles.labelRequired}>*</span>
              </Label>
              <Select value={toAccount} onValueChange={setToAccount}>
                <SelectTrigger className={styles.select}>
                  <SelectValue placeholder="Выберите счет назначения" />
                </SelectTrigger>
                <SelectContent>
                  {accounts
                    .filter(acc => acc._id !== fromAccount)
                    .map((account) => (
                      <SelectItem key={account._id} value={account._id}>
                        {account.name}
                      </SelectItem>
                    ))}
                </SelectContent>
              </Select>
            </div>
          )}
          <div className={styles.inputBlock}>
            <Label htmlFor="amount" className={styles.label}>
              Сумма <span className={styles.labelRequired}>*</span>
            </Label>
            <Input
              id="amount"
              className={styles.input}
              type="number"
              min={0}
              placeholder="0"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
            />
          </div>
          <div className={styles.inputBlock}>
            <Label className={styles.label}>
              Дата операции <span className={styles.labelRequired}>*</span>
            </Label>
            <Popover>
            <PopoverTrigger asChild>
              <Button
                variant="outline"
                className={cn(styles.calendarButton, !date && styles.calendarButtonPlaceholder)}
              >
                <CalendarIcon className="mr-2 h-4 w-4" />
                {date ? format(date, 'dd.MM.yyyy') : 'Выберите дату'}
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-auto p-0" align="start">
              <Calendar
                mode="single"
                selected={date}
                onSelect={(selectedDate) => {
                  setDate(selectedDate);
                  setCalendarOpen(false);
                }}
                className="p-3 pointer-events-auto"
              />
            </PopoverContent>
          </Popover>
          </div>
          {/* Кредитные периоды + обработка отсутствия */}
          {shouldShowCreditPeriods() && (
            <div className={styles.inputBlock}>
              <Label htmlFor="creditPeriod" className={styles.label}>
                Кредитный период <span className={styles.labelRequired}>*</span>
              </Label>
              {showNoPeriodsBanner ? (
                <div className={styles.infoBanner}>
                <AlertTriangle className={styles.infoBanner__icon} />
                Нет доступных для погашения периодов.
              </div>
              ) : (
                <Select
                  value={creditPeriod}
                  onValueChange={setCreditPeriod}
                  disabled={loadingPeriods}
                >
                  <SelectTrigger className={styles.select}>
                    <SelectValue placeholder="Выберите период" />
                  </SelectTrigger>
                  <SelectContent>
                    {creditPeriods.map((period) => (
                      <SelectItem key={period.periodId} value={period.periodId}>
                        {renderPeriodLabel(period)}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              )}
            </div>
          )}
          {shouldShowInterestCheckbox() && (
            <div className={styles.flexRow}>
              <Checkbox
                id="payInterest"
                checked={payInterest}
                onCheckedChange={checked => setPayInterest(checked === true)}
              />
              <Label htmlFor="payInterest" className={styles.label}>
                Погашение процентов
              </Label>
            </div>
          )}
          <div className={styles.inputBlock}>
            <Label htmlFor="description" className={styles.label}>
              Описание
            </Label>
            <Input
              id="description"
              className={styles.input}
              placeholder="Описание операции"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
            />
          </div>
        </div>
        <DialogFooter className={styles.footer}>
          <Button onClick={handleClose}>
            Отменить
          </Button>
          <Button
          className={styles.editBtn}
            onClick={handleSubmit}
            disabled={submitDisabled}
          >
            Добавить
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};