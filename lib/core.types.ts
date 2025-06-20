export type APIAccount = {
    _id: string;
    name: string;
    type: "debit" | "creditCard" | "cash";
    balance: number;
    currency: string;
    owner: { id: string; name: string };
};

export type BackendTransaction = {
    _id: string;
    amount: number;
    date: string;
    type: "income" | "expense" | "transfer";
    user?: { id: string; name: string };
    category?: { id: string; name: string };
    account?: { name: string; type: string; currency: string, owner?: { id: string; name: string } };
    // Только для transfer:
    fromAccount?: { name: string; type: string; currency: string; owner?: { id: string; name: string } };
    toAccount?: { name: string; type: string; currency: string; owner?: { id: string; name: string } };
    // Опционально для всех:
    description?: string;
};