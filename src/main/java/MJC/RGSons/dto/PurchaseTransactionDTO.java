package MJC.RGSons.dto;

import java.util.List;

public class PurchaseTransactionDTO {
    private String invoiceNo;
    private String invoiceDate;
    private String partyCode;
    private String partyName;
    private Double purchaseAmount;
    private Double totalAmount;
    private String storeCode;
    private String storeName;
    private String narration;
    private String userName;
    private String purLed;
    private String purLedName;
    private List<PurchaseItemDTO> items;
    private List<PurchaseLedgerDTO> ledgerDetails;

    public String getInvoiceNo() { return invoiceNo; }
    public void setInvoiceNo(String invoiceNo) { this.invoiceNo = invoiceNo; }

    public String getInvoiceDate() { return invoiceDate; }
    public void setInvoiceDate(String invoiceDate) { this.invoiceDate = invoiceDate; }

    public String getPartyCode() { return partyCode; }
    public void setPartyCode(String partyCode) { this.partyCode = partyCode; }

    public String getPartyName() { return partyName; }
    public void setPartyName(String partyName) { this.partyName = partyName; }

    public Double getPurchaseAmount() { return purchaseAmount; }
    public void setPurchaseAmount(Double purchaseAmount) { this.purchaseAmount = purchaseAmount; }

    public Double getTotalAmount() { return totalAmount; }
    public void setTotalAmount(Double totalAmount) { this.totalAmount = totalAmount; }

    public String getStoreCode() { return storeCode; }
    public void setStoreCode(String storeCode) { this.storeCode = storeCode; }

    public String getStoreName() { return storeName; }
    public void setStoreName(String storeName) { this.storeName = storeName; }

    public String getNarration() { return narration; }
    public void setNarration(String narration) { this.narration = narration; }

    public String getUserName() { return userName; }
    public void setUserName(String userName) { this.userName = userName; }

    public String getPurLed() { return purLed; }
    public void setPurLed(String purLed) { this.purLed = purLed; }

    public String getPurLedName() { return purLedName; }
    public void setPurLedName(String purLedName) { this.purLedName = purLedName; }

    public List<PurchaseItemDTO> getItems() { return items; }
    public void setItems(List<PurchaseItemDTO> items) { this.items = items; }

    public List<PurchaseLedgerDTO> getLedgerDetails() { return ledgerDetails; }
    public void setLedgerDetails(List<PurchaseLedgerDTO> ledgerDetails) { this.ledgerDetails = ledgerDetails; }

    public static class PurchaseItemDTO {
        private String itemCode;
        private String itemName;
        private String sizeCode;
        private String sizeName;
        private Double price;
        private Integer quantity;
        private Double amount;

        public String getItemCode() { return itemCode; }
        public void setItemCode(String itemCode) { this.itemCode = itemCode; }

        public String getItemName() { return itemName; }
        public void setItemName(String itemName) { this.itemName = itemName; }

        public String getSizeCode() { return sizeCode; }
        public void setSizeCode(String sizeCode) { this.sizeCode = sizeCode; }

        public String getSizeName() { return sizeName; }
        public void setSizeName(String sizeName) { this.sizeName = sizeName; }

        public Double getPrice() { return price; }
        public void setPrice(Double price) { this.price = price; }

        public Integer getQuantity() { return quantity; }
        public void setQuantity(Integer quantity) { this.quantity = quantity; }

        public Double getAmount() { return amount; }
        public void setAmount(Double amount) { this.amount = amount; }
    }

    public static class PurchaseLedgerDTO {
        private String ledgerCode;
        private String ledgerName;
        private Double amount;
        private String type;

        public String getLedgerCode() { return ledgerCode; }
        public void setLedgerCode(String ledgerCode) { this.ledgerCode = ledgerCode; }

        public String getLedgerName() { return ledgerName; }
        public void setLedgerName(String ledgerName) { this.ledgerName = ledgerName; }

        public Double getAmount() { return amount; }
        public void setAmount(Double amount) { this.amount = amount; }

        public String getType() { return type; }
        public void setType(String type) { this.type = type; }
    }
}
