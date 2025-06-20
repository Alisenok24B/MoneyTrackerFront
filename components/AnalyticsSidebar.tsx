/* eslint-disable @typescript-eslint/no-explicit-any */

import { useState } from 'react';
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { 
  PieChart, 
  User, 
  CreditCard, 
  Plus, 
  ChevronDown, 
  ChevronRight,
} from 'lucide-react';
import { Link } from 'react-router-dom';
import { AddAccountModal } from './AddAccountModal';
import { AccountDetailModal } from './AccountDetailModal';

const accounts = [
  {
    name: "Дебетовые карты",
    amount: "400 000,00 ₽",
    items: [
      { id: '1', name: "Tinkoff Black", amount: "390 886,88 ₽", type: 'debit' },
      { id: '2', name: "Tinkoff Black", amount: "390 886,88 ₽", subtitle: "Алиса", type: 'debit' }
    ]
  },
  {
    name: "Кредитные карты",
    amount: "20 000,00 ₽",
    items: []
  },
  {
    name: "Наличные",
    amount: "20 000,00 ₽",
    items: []
  },
  {
    name: "Вклады",
    amount: "20 000,00 ₽",
    items: []
  },
  {
    name: "Накопительные счета",
    amount: "20 000,00 ₽",
    items: []
  }
];

export const AnalyticsSidebar = () => {
  const [expandedSections, setExpandedSections] = useState<{ [key: string]: boolean }>({
    "Дебетовые карты": true
  });
  const [isAddAccountOpen, setIsAddAccountOpen] = useState(false);
  const [selectedAccount, setSelectedAccount] = useState<any>(null);
  const [isAccountDetailOpen, setIsAccountDetailOpen] = useState(false);

  const toggleSection = (sectionName: string) => {
    setExpandedSections(prev => ({
      ...prev,
      [sectionName]: !prev[sectionName]
    }));
  };

  const handleAccountClick = (account: any) => {
    setSelectedAccount(account);
    setIsAccountDetailOpen(true);
  };

  const handleAddAccountClick = () => {
    setIsAddAccountOpen(true);
  };

  return (
    <div className="w-80 bg-background border-r border-border p-6 space-y-6">
      {/* Navigation */}
      <div className="space-y-2">
        <Link to="/">
          <div className="flex items-center gap-3 p-2 rounded-lg hover:bg-accent/50 transition-colors cursor-pointer">
            <PieChart className="h-5 w-5" />
            <span>Активы (400 000,00 ₽)</span>
          </div>
        </Link>
        <Link to="/profile">
          <div className="flex items-center gap-3 p-2 rounded-lg hover:bg-accent/50 transition-colors cursor-pointer">
            <User className="h-5 w-5" />
            <span>Профиль</span>
          </div>
        </Link>
      </div>

      <Separator />

      {/* Upcoming Payments */}
      <div className="space-y-3">
        <h3 className="font-medium text-muted-foreground">Ближайшие платежи</h3>
        <div className="space-y-2">
          <div className="text-sm text-muted-foreground">Сегодня</div>
          <div className="flex items-center gap-3 p-2 rounded-lg">
            <CreditCard className="h-4 w-4 text-muted-foreground" />
            <div className="flex-1">
              <div className="text-sm text-red-400">-390 886,88 ₽</div>
              <div className="text-xs text-muted-foreground">Кредитная карта</div>
            </div>
          </div>
        </div>
      </div>

      <Separator />

      {/* Assets */}
      <div className="space-y-3">
        <h3 className="font-medium">Активы</h3>
        
        <div className="space-y-1">
          {accounts.map((account) => (
            <div key={account.name} className="space-y-1">
              <Button
                variant="ghost"
                className="w-full justify-between h-auto p-2 font-normal"
                onClick={() => toggleSection(account.name)}
              >
                <div className="flex items-center gap-2">
                  {expandedSections[account.name] ? (
                    <ChevronDown className="h-4 w-4" />
                  ) : (
                    <ChevronRight className="h-4 w-4" />
                  )}
                  <span className="text-sm">{account.name}</span>
                </div>
                <span className="text-sm text-muted-foreground">{account.amount}</span>
              </Button>

              {expandedSections[account.name] && account.items.length > 0 && (
                <div className="ml-6 space-y-1">
                  {account.items.map((item, index) => (
                    <div 
                      key={index} 
                      className="flex items-center justify-between p-2 rounded-lg hover:bg-accent/50 transition-colors cursor-pointer"
                      onClick={() => handleAccountClick(item)}
                    >
                      <div className="flex items-center gap-2">
                        <CreditCard className="h-4 w-4 text-muted-foreground" />
                        <div>
                          <div className="text-sm">{item.amount}</div>
                          <div className="text-xs text-muted-foreground">{item.name}</div>
                          {item.subtitle && (
                            <div className="text-xs text-muted-foreground">{item.subtitle}</div>
                          )}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          ))}
          
          <Button 
            variant="ghost" 
            className="w-full justify-start gap-2 h-auto p-2 font-normal text-muted-foreground bg-accent/10 hover:bg-accent/30"
            onClick={handleAddAccountClick}
          >
            <Plus className="h-4 w-4" />
            <span className="text-sm font-medium">Добавить счет</span>
          </Button>
        </div>
      </div>

      <AddAccountModal 
        open={isAddAccountOpen}
        onOpenChange={setIsAddAccountOpen}
      />

      <AccountDetailModal
        open={isAccountDetailOpen}
        onOpenChange={setIsAccountDetailOpen}
        account={selectedAccount}
      />
    </div>
  );
};
