import { Popover, PopoverTrigger, PopoverContent } from "@/components/ui/popover";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import styles from "../dashboard.module.css";
import { APIAccount } from "@/lib/core.types";
import { useState } from 'react';

type AccountsMultiSelectProps = {
  accounts: APIAccount[];
  selectedAccounts: string[];
  setSelectedAccounts: (ids: string[]) => void;
};

export const AccountsMultiSelect = ({
  accounts,
  selectedAccounts,
  setSelectedAccounts,
}: AccountsMultiSelectProps) => {
  const [open, setOpen] = useState(false);

  const handleAccountChange = (accountId: string) => {
    if (selectedAccounts.includes(accountId)) {
      setSelectedAccounts(selectedAccounts.filter((id) => id !== accountId));
    } else {
      setSelectedAccounts([...selectedAccounts, accountId]);
    }
  };

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button variant="secondary" className={styles.accountsCard}>
          <span className={styles.accountsCardText}>
            {selectedAccounts.length === accounts.length
              ? "Выбраны все счета"
              : selectedAccounts.length === 0
              ? "Выберите счета"
              : `Выбрано: ${selectedAccounts.length}`}
          </span>
        </Button>
      </PopoverTrigger>
      <PopoverContent className="p-2 min-w-[220px]">
        {accounts.map((account) => (
          <div key={account._id} className="flex items-center space-x-2 px-2 py-1.5">
            <Checkbox
              id={account._id}
              checked={selectedAccounts.includes(account._id)}
              onCheckedChange={() => handleAccountChange(account._id)}
            />
            <label htmlFor={account._id} className="text-sm cursor-pointer">
              {account.name}
            </label>
          </div>
        ))}
      </PopoverContent>
    </Popover>
  );
};