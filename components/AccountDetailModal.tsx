import { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import styles from "./AccountDetailModal.module.css";
import { getToken } from "@/utils/jwt";

interface AccountOwner {
  id: string;
  name: string;
}

interface CreditDetails {
  creditLimit: number;
  billingCycleType: 'fixed' | 'calendar';
  paymentPeriodDays: number;
  interestRate: number;
  gracePeriodDays?: number;
}

interface AccountData {
  _id: string;
  name: string;
  type: 'debit' | 'creditCard' | 'cash' | 'savings';
  balance: number;
  creditDetails?: CreditDetails;
  owner?: AccountOwner;
}

interface AccountDetailModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  account: { _id: string } | null;
  onDeleted?: () => void;
  onEdited?: () => void; 
  canEdit?: boolean;
}

export const AccountDetailModal = ({
  open,
  onOpenChange,
  account,
  onDeleted,
  onEdited,
  canEdit
}: AccountDetailModalProps) => {
  const [isEditing, setIsEditing] = useState(false);
  const [fetchedAccount, setFetchedAccount] = useState<AccountData | null>(null);
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  // Для редактирования
  const [accountName, setAccountName] = useState('');
  const [creditLimit, setCreditLimit] = useState('');
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    if (open && account?._id) {
      setLoading(true);
      setErr(null);
      fetchAccount();
    } else if (!open) {
      setFetchedAccount(null);
      setErr(null);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, account]);

  const fetchAccount = async () => {
    try {
      const token = getToken();
      const res = await fetch(`http://localhost:3333/api/accounts/${account?._id}`, {
        headers: {
          "Content-Type": "application/json",
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
      });
      if (!res.ok) {
        setErr("Ошибка при загрузке данных.");
        setFetchedAccount(null);
        return;
      }
      const data = await res.json();
      setFetchedAccount(data.account);
    } catch {
      setErr("Ошибка сети.");
      setFetchedAccount(null);
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async () => {
    if (!fetchedAccount) return;
    setLoading(true);
    setErr(null);
    try {
      const token = getToken();
      const res = await fetch(`http://localhost:3333/api/accounts/${fetchedAccount._id}`, {
        method: "DELETE",
        headers: {
          "Content-Type": "application/json",
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
      });
      if (!res.ok) {
        setErr("Ошибка удаления счета.");
        setLoading(false);
        return;
      }
      setLoading(false);
      if (onDeleted) onDeleted();
      onOpenChange(false);
    } catch {
      setErr("Ошибка сети при удалении.");
      setLoading(false);
    }
  };

  const handleEdit = () => {
    if (fetchedAccount) {
      setAccountName(fetchedAccount.name);
      setCreditLimit(
        fetchedAccount.type === "creditCard"
          ? fetchedAccount.creditDetails?.creditLimit?.toString() || ''
          : ''
      );
      setIsEditing(true);
    }
  };

  const handleSave = async () => {
    if (!fetchedAccount) return;
    setIsSaving(true);
    setErr(null);
  
    try {
      const token = getToken();
      // Готовим только то, что нужно для PATCH
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const body: any = { name: accountName };
      if (fetchedAccount.type === "creditCard") {
        body.creditDetails = {
          creditLimit: Number(creditLimit),
        };
      }
      const res = await fetch(`http://localhost:3333/api/accounts/${fetchedAccount._id}`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: JSON.stringify(body),
      });
  
      if (!res.ok) {
        setErr("Ошибка при сохранении изменений.");
        setIsSaving(false);
        return;
      }
      // После обновления — обновляем данные в модалке
      await fetchAccount();
      setIsEditing(false);
      setIsSaving(false);
      if (onEdited) onEdited();
    } catch {
      setErr("Ошибка сети при сохранении.");
      setIsSaving(false);
    }
  };

  const handleCancel = () => {
    setIsEditing(false);
    setAccountName('');
    setCreditLimit('');
  };
  const handleClose = () => {
    setIsEditing(false);
    setAccountName('');
    setCreditLimit('');
    onOpenChange(false);
  };

  const typeLabel = (type: string) => {
    if (type === 'debit') return 'Дебетовая карта';
    if (type === 'creditCard') return 'Кредитная карта';
    if (type === 'cash') return 'Наличные';
    if (type === 'savings') return 'Сберегательный счет';
    return type;
  };

  // ====== UI ======

  if (!open) return null;
  if (loading && !fetchedAccount) {
    return (
      <Dialog open={open} onOpenChange={handleClose}>
        <DialogContent className={styles.modalContent}>
          <DialogHeader>
            <DialogTitle>Загрузка...</DialogTitle>
          </DialogHeader>
        </DialogContent>
      </Dialog>
    );
  }
  if (err && !fetchedAccount) {
    return (
      <Dialog open={open} onOpenChange={handleClose}>
        <DialogContent className={styles.modalContent}>
          <DialogHeader>
            <DialogTitle>Ошибка</DialogTitle>
          </DialogHeader>
          <div className="text-red-600">{err}</div>
        </DialogContent>
      </Dialog>
    );
  }
  if (!fetchedAccount) return null;

  const formattedBalance = `${fetchedAccount.balance.toLocaleString('ru-RU')} ₽`;
  const cd = fetchedAccount.creditDetails;

  const isModified =
    accountName !== fetchedAccount.name ||
    (fetchedAccount.type === "creditCard" &&
      Number(creditLimit) !== cd?.creditLimit);

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className={styles.modalContent}>
        <DialogHeader className={styles.header}>
          <DialogTitle>
            {isEditing ? 'Редактировать счет' : 'Информация о счете'}
          </DialogTitle>
        </DialogHeader>

        <div className={styles.detailBody}>
          {/* Тип и имя */}
          <div className={styles.rowTop}>
            <Badge className={styles.typeBadge} variant="outline">
              {typeLabel(fetchedAccount.type)}
            </Badge>
            {fetchedAccount.owner?.name && (
              <span className={styles.ownerLabel}>Владелец: <b>{fetchedAccount.owner.name}</b></span>
            )}
          </div>
          <h2 className={styles.accountName}>
            {isEditing ? (
              <Input
                id="accountName"
                value={accountName}
                onChange={(e) => setAccountName(e.target.value)}
                className={styles.accountNameInput}
                disabled={isSaving}
              />
            ) : (
              fetchedAccount.name
            )}
          </h2>

          {/* Баланс */}
          <div className={styles.balanceBlock}>
            <span className={styles.balanceLabel}>Текущий баланс</span>
            <span className={styles.balanceValue}>{formattedBalance}</span>
          </div>

          <Separator className={styles.sep} />

          {/* Данные кредитной карты */}
          {fetchedAccount.type === 'creditCard' && cd && (
            <div className={styles.creditBlock}>
              <div className={styles.creditRow}>
                <span>Кредитный лимит</span>
                {isEditing ? (
                  <Input
                    id="creditLimit"
                    type="number"
                    value={creditLimit}
                    onChange={e => setCreditLimit(e.target.value.replace(",", "."))}
                    className={styles.accountNameInput}
                    style={{ maxWidth: 120 }}
                    disabled={isSaving}
                  />
                ) : (
                  <span className={styles.creditValue}>
                    {Number(cd.creditLimit).toLocaleString('ru-RU')} ₽
                  </span>
                )}
              </div>
              <div className={styles.creditRow}>
                <span>Тип цикла расчета</span>
                <span className={styles.creditValue}>
                  {cd.billingCycleType === 'fixed' ? 'Фиксированный' : 'Календарь'}
                </span>
              </div>
              {typeof cd.gracePeriodDays === 'number' && (
                <div className={styles.creditRow}>
                  <span>Количество дней кредитного цикла</span>
                  <span className={styles.creditValue}>{cd.gracePeriodDays} дней</span>
                </div>
              )}
              <div className={styles.creditRow}>
                <span>Количество дней на оплату</span>
                <span className={styles.creditValue}>{cd.paymentPeriodDays} дней</span>
              </div>
              <div className={styles.creditRow}>
                <span>Годовой процент по карте</span>
                <span className={styles.creditValue}>{cd.interestRate}%</span>
              </div>
            </div>
          )}
        </div>

        {err && <div className="text-red-600">{err}</div>}

        <DialogFooter className={styles.footer}>
        <Button onClick={handleClose}>Закрыть</Button>
        {!fetchedAccount.owner?.id && 
            <Button
              variant="destructive"
              className={styles.dangerBtn}
              onClick={handleDelete}
              type="button"
              disabled={loading}
            >
              Удалить
            </Button>
            }
          {isEditing ? (
            <>
              <Button onClick={handleCancel} disabled={isSaving}>Отменить</Button>
              <Button className={styles.editBtn} onClick={handleSave} disabled={isSaving || !isModified}>
                {isSaving ? "Сохраняю..." : "Сохранить"}
              </Button>
            </>
          ) : (
            <>
              <Button hidden={!canEdit} className={styles.editBtn} onClick={handleEdit}>Редактировать</Button>
            </>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};