package MJC.RGSons.dto;

import java.time.LocalDate;
import java.util.List;
import com.fasterxml.jackson.annotation.JsonFormat;

public class SalesTransactionDTO {
    private String invoiceNo;
    @JsonFormat(pattern = "dd-MM-yyyy")
    private LocalDate invoiceDate;
    private String partyCode;
    private String partyName; // Added field
    private Double saleAmount; // Mapped from totalAmount
    private String tenderType;
    private String storeCode;
    
    // Total amounts for TranHead
    private Double otherSale;
    private Double totalExpenses;
    private Double totalTender;

    // Details for TranLedgers
    private List<LedgerEntryDTO> otherSaleDetails;
    private List<LedgerEntryDTO> expenseDetails;
    private List<LedgerEntryDTO> tenderDetails;

    private List<SalesItemDTO> items;

    // Getters and Setters

    public String getInvoiceNo() { return invoiceNo; }
    public void setInvoiceNo(String invoiceNo) { this.invoiceNo = invoiceNo; }
    public LocalDate getInvoiceDate() { return invoiceDate; }
    public void setInvoiceDate(LocalDate invoiceDate) { this.invoiceDate = invoiceDate; }
    public String getPartyCode() { return partyCode; }
    public void setPartyCode(String partyCode) { this.partyCode = partyCode; }
    
    public String getPartyName() { return partyName; }
    public void setPartyName(String partyName) { this.partyName = partyName; }

    public Double getSaleAmount() { return saleAmount; }
    public void setSaleAmount(Double saleAmount) { this.saleAmount = saleAmount; }
    
    public String getTenderType() { return tenderType; }
    public void setTenderType(String tenderType) { this.tenderType = tenderType; }
    public String getStoreCode() { return storeCode; }
    public void setStoreCode(String storeCode) { this.storeCode = storeCode; }

    public Double getOtherSale() { return otherSale; }
    public void setOtherSale(Double otherSale) { this.otherSale = otherSale; }

    public Double getTotalExpenses() { return totalExpenses; }
    public void setTotalExpenses(Double totalExpenses) { this.totalExpenses = totalExpenses; }

    public Double getTotalTender() { return totalTender; }
    public void setTotalTender(Double totalTender) { this.totalTender = totalTender; }

    public List<LedgerEntryDTO> getOtherSaleDetails() { return otherSaleDetails; }
    public void setOtherSaleDetails(List<LedgerEntryDTO> otherSaleDetails) { this.otherSaleDetails = otherSaleDetails; }

    public List<LedgerEntryDTO> getExpenseDetails() { return expenseDetails; }
    public void setExpenseDetails(List<LedgerEntryDTO> expenseDetails) { this.expenseDetails = expenseDetails; }

    public List<LedgerEntryDTO> getTenderDetails() { return tenderDetails; }
    public void setTenderDetails(List<LedgerEntryDTO> tenderDetails) { this.tenderDetails = tenderDetails; }

    public List<SalesItemDTO> getItems() { return items; }
    public void setItems(List<SalesItemDTO> items) { this.items = items; }

    public static class SalesItemDTO {
        private String itemCode;
        private String itemName; // Added field
        private String sizeCode;
        private Double mrp;
        private Integer quantity;
        private Double amount;

        public String getItemCode() { return itemCode; }
        public void setItemCode(String itemCode) { this.itemCode = itemCode; }
        public String getItemName() { return itemName; }
        public void setItemName(String itemName) { this.itemName = itemName; }
        public String getSizeCode() { return sizeCode; }
        public void setSizeCode(String sizeCode) { this.sizeCode = sizeCode; }
        public Double getMrp() { return mrp; }
        public void setMrp(Double mrp) { this.mrp = mrp; }
        public Integer getQuantity() { return quantity; }
        public void setQuantity(Integer quantity) { this.quantity = quantity; }
        public Double getAmount() { return amount; }
        public void setAmount(Double amount) { this.amount = amount; }
    }

    public static class LedgerEntryDTO {
        private String ledgerCode;
        private String ledgerName; // Added field
        private Double amount;

        public String getLedgerCode() { return ledgerCode; }
        public void setLedgerCode(String ledgerCode) { this.ledgerCode = ledgerCode; }
        public String getLedgerName() { return ledgerName; }
        public void setLedgerName(String ledgerName) { this.ledgerName = ledgerName; }
        public Double getAmount() { return amount; }
        public void setAmount(Double amount) { this.amount = amount; }
    }
}
