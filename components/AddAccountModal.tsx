/* eslint-disable react-hooks/exhaustive-deps */
import { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { CalendarIcon, Info, CreditCard, Wallet, Banknote } from "lucide-react";
import { format, isBefore, startOfDay } from "date-fns";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { cn } from "@/lib/utils";
import { getToken } from "@/utils/jwt";
import styles from "./AddAccountModal.module.css";

interface AddAccountModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onAccountAdded?: () => void; // вызывается после успешного добавления счета
}

const accountTypes = [
  { id: 'debit', name: 'Дебетовые карты', icon: <CreditCard className={styles.accountTypeIcon} /> },
  { id: 'credit', name: 'Кредитные карты', icon: <Wallet className={styles.accountTypeIcon} /> },
  { id: 'cash', name: 'Наличные', icon: <Banknote className={styles.accountTypeIcon} /> },
];

const cycleTypes = [
  { id: 'fixed', name: 'Фиксированный' },
  { id: 'calendar', name: 'Календарь' },
];

const mapAccountTypeToApi = (uiType: string) => {
  if (uiType === 'credit') return 'creditCard';
  if (uiType === 'debit') return 'debit';
  if (uiType === 'cash') return 'cash';
  return uiType;
};

export const AddAccountModal = ({
  open,
  onOpenChange,
  onAccountAdded,
}: AddAccountModalProps) => {
  const [accountName, setAccountName] = useState('');
  const [accountType, setAccountType] = useState<string>('debit');
  const [initialBalance, setInitialBalance] = useState('');
  const [creditLimit, setCreditLimit] = useState('');
  const [cycleType, setCycleType] = useState<'fixed' | 'calendar'>('fixed');
  const [creditCycleDays, setCreditCycleDays] = useState('');
  const [nextStatementDate, setNextStatementDate] = useState<Date>();
  const [paymentDays, setPaymentDays] = useState('');
  const [annualRate, setAnnualRate] = useState('');
  const [submitting, setSubmitting] = useState(false);

  // Определения
  const isCreditCard = accountType === 'credit';
  const isFixedCycle = isCreditCard && cycleType === 'fixed';

  // По умолчанию "fixed" для кредитки
  useEffect(() => {
    if (isCreditCard) setCycleType('fixed');
  }, [accountType]);

  useEffect(() => {
    if (open) {
      resetForm();
    }
  }, [open]);

  const handleStatementDateSelect = (date?: Date) => {
    if (date && isBefore(date, startOfDay(new Date()))) return;
    setNextStatementDate(date);
  };

  const handleSubmit = async () => {
    setSubmitting(true);
    try {
      const token = getToken();
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const body: any = {
        name: accountName,
        type: mapAccountTypeToApi(accountType),
        currency: "RUB",
      };

      if (!isCreditCard) {
        body.balance = Number(initialBalance);
      }

      if (isCreditCard) {
        body.creditDetails = {
          creditLimit: Number(creditLimit),
          billingCycleType: cycleType,
          gracePeriodDays: isFixedCycle ? Number(creditCycleDays) : undefined,
          paymentPeriodDays: Number(paymentDays),
          statementAnchor: isFixedCycle && nextStatementDate ? format(nextStatementDate, "yyyy-MM-dd") : undefined,
          interestRate: Number(annualRate),
        };
        if (!isFixedCycle) {
          delete body.creditDetails.gracePeriodDays;
          delete body.creditDetails.statementAnchor;
        }
      }

      const res = await fetch("http://localhost:3333/api/accounts", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: JSON.stringify(body),
      });

      if (!res.ok) {
        setSubmitting(false);
        return;
      }
      if (onAccountAdded) onAccountAdded();
      handleClose();
    } catch {
      setSubmitting(false);
    }
  };

  const resetForm = () => {
    setAccountName('');
    setAccountType('debit');
    setInitialBalance('');
    setCreditLimit('');
    setCycleType('fixed');
    setCreditCycleDays('');
    setNextStatementDate(undefined);
    setPaymentDays('');
    setAnnualRate('');
  };

  const handleClose = () => {
    resetForm();
    setSubmitting(false);
    onOpenChange(false);
  };

  // disable all dates before today
  const disabledDates = (date: Date) => isBefore(date, startOfDay(new Date()));

  return (
    <TooltipProvider>
      <Dialog open={open} onOpenChange={handleClose}>
        <DialogContent className={styles.modalContent}>
          <DialogHeader className={styles.header}>
            <DialogTitle>Добавить счет</DialogTitle>
          </DialogHeader>

          <div className={styles.formBlock}>
            {/* Наименование счета */}
            <div className={styles.inputBlock}>
              <Label htmlFor="accountName" className={styles.label}>
                Наименование счета <span className={styles.labelRequired}>*</span>
              </Label>
              <Input
                id="accountName"
                className={styles.input}
                placeholder="Введите название счета"
                value={accountName}
                onChange={(e) => setAccountName(e.target.value)}
              />
            </div>

            {/* Тип счета */}
            <div className={styles.inputBlock}>
              <Label htmlFor="accountType" className={styles.label}>
                Тип счета <span className={styles.labelRequired}>*</span>
              </Label>
              <Select value={accountType} onValueChange={setAccountType}>
                <SelectTrigger className={styles.select}>
                  <SelectValue placeholder="Выберите тип счета" />
                </SelectTrigger>
                <SelectContent>
                  {accountTypes.map((type) => (
                    <SelectItem key={type.id} value={type.id}>
                      <span className={styles.accountTypeItem}>
                        {type.icon}
                        {type.name}
                      </span>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Начальный баланс — только для не кредитки */}
            {!isCreditCard && (
              <div className={styles.inputBlock}>
                <Label htmlFor="initialBalance" className={styles.label}>
                  Начальный баланс <span className={styles.labelRequired}>*</span>
                </Label>
                <Input
                  id="initialBalance"
                  className={styles.input}
                  type="number"
                  step="0.01"
                  placeholder="0"
                  value={initialBalance}
                  onChange={(e) => setInitialBalance(e.target.value.replace(",", "."))}
                />
              </div>
            )}

            {/* Поля для кредитной карты */}
            {isCreditCard && (
  <div className={styles.creditGrid}>
    {/* Лимит */}
    <div className={styles.inputBlock}>
      <Label htmlFor="creditLimit" className={styles.label}>
        Кредитный лимит <span className={styles.labelRequired}>*</span>
      </Label>
      <Input
        id="creditLimit"
        className={styles.input}
        type="number"
        placeholder="0"
        value={creditLimit}
        onChange={(e) => setCreditLimit(e.target.value)}
      />
    </div>
    {/* Процент */}
    <div className={styles.inputBlock}>
      <Label htmlFor="annualRate" className={styles.label}>
        Годовой процент <span className={styles.labelRequired}>*</span>
      </Label>
      <Input
        id="annualRate"
        className={styles.input}
        type="number"
        step="0.01"
        placeholder="0.00"
        value={annualRate}
        onChange={(e) => setAnnualRate(e.target.value)}
      />
    </div>
    {/* Дней на оплату */}
    <div className={styles.inputBlock}>
      <Label htmlFor="paymentDays" className={styles.label}>
        Дней на оплату <span className={styles.labelRequired}>*</span>
      </Label>
      <Input
        id="paymentDays"
        className={styles.input}
        type="number"
        placeholder="0"
        value={paymentDays}
        onChange={(e) => setPaymentDays(e.target.value)}
      />
    </div>
    {/* Тип цикла — занимает две колонки */}
    <div className={cn(styles.inputBlock, styles.cycleTypeBlock)}>
      <Label className={styles.flexRow}>
        Тип цикла <span className={styles.labelRequired}>*</span>
        <Tooltip>
          <TooltipTrigger asChild>
            <Info className={styles.tooltipIcon} />
          </TooltipTrigger>
          <TooltipContent side="top" className={styles.tooltipContentFix}>
            <p>
              <b>Фиксированный</b> — например, каждые 55 дней.<br />
              <b>Календарь</b> — в определённую дату месяца.
            </p>
          </TooltipContent>
        </Tooltip>
      </Label>
      <RadioGroup
        value={cycleType}
        onValueChange={(val) => setCycleType(val as 'fixed' | 'calendar')}
        className={styles.radioGroup}
      >
        {cycleTypes.map((type) => (
          <div key={type.id} className={styles.flexRow}>
            <RadioGroupItem value={type.id} id={type.id} />
            <Label htmlFor={type.id}>{type.name}</Label>
          </div>
        ))}
      </RadioGroup>
    </div>
    {/* Только для фиксированного цикла: две колонки одной строкой */}
    {isFixedCycle && (
      <>
        <div className={styles.inputBlock}>
          <Label htmlFor="creditCycleDays" className={styles.flexRow}>
            Дней цикла <span className={styles.labelRequired}>*</span>
            <Tooltip>
              <TooltipTrigger asChild>
                <Info className={styles.tooltipIcon} />
              </TooltipTrigger>
              <TooltipContent side="top" className={styles.tooltipContentFix}>
                <p>Общее количество дней в кредитном цикле.</p>
              </TooltipContent>
            </Tooltip>
          </Label>
          <Input
            id="creditCycleDays"
            className={styles.input}
            type="number"
            placeholder="0"
            value={creditCycleDays}
            onChange={(e) => setCreditCycleDays(e.target.value)}
          />
        </div>
        <div className={styles.inputBlock}>
          <Label className={styles.label}>
            Дата выписки <span className={styles.labelRequired}>*</span>
          </Label>
          <Popover>
            <PopoverTrigger asChild>
              <Button
                variant="outline"
                className={cn(styles.calendarButton, !nextStatementDate && styles.calendarButtonPlaceholder)}
              >
                <CalendarIcon className="mr-2 h-4 w-4" />
                {nextStatementDate ? format(nextStatementDate, "dd.MM.yyyy") : "Выберите дату"}
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-auto p-0" align="start">
              <Calendar
                mode="single"
                selected={nextStatementDate}
                onSelect={handleStatementDateSelect}
                className="p-3 pointer-events-auto"
                disabled={disabledDates}
              />
            </PopoverContent>
          </Popover>
        </div>
      </>
    )}
  </div>
)}
          </div>
          <DialogFooter className={styles.footer}>
          <Button
              onClick={handleClose}
              disabled={submitting}
            >
              Отменить
            </Button>
            <Button
              onClick={handleSubmit}
              className={styles.editBtn}
              disabled={
                submitting ||
                !accountName ||
                !accountType ||
                (!isCreditCard && (!initialBalance || isNaN(Number(initialBalance)))) ||
                (isCreditCard && (!creditLimit || !cycleType || !paymentDays || !annualRate)) ||
                (isFixedCycle && (!creditCycleDays || !nextStatementDate))
              }
            >
              {submitting ? 'Добавление...' : 'Добавить'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </TooltipProvider>
  );
};