package MJC.RGSons.dto;

public class PurchaseSummaryDTO {
    private String storeCode;
    private String storeName;
    private String date;
    private String billNumber;
    private String status;
    private String partyInvoiceNo;
    private String supplierName;
    private String purchaseLedgerCode;
    private String purchaseLedgerName;
    private Integer totalQuantity;
    private Double amount;

    public PurchaseSummaryDTO() {}

    public PurchaseSummaryDTO(String storeCode, String storeName, String date, String billNumber, String status, String partyInvoiceNo, String supplierName, String purchaseLedgerCode, String purchaseLedgerName, Integer totalQuantity, Double amount) {
        this.storeCode = storeCode;
        this.storeName = storeName;
        this.date = date;
        this.billNumber = billNumber;
        this.status = status;
        this.partyInvoiceNo = partyInvoiceNo;
        this.supplierName = supplierName;
        this.purchaseLedgerCode = purchaseLedgerCode;
        this.purchaseLedgerName = purchaseLedgerName;
        this.totalQuantity = totalQuantity;
        this.amount = amount;
    }

    public String getStoreCode() {
        return storeCode;
    }

    public void setStoreCode(String storeCode) {
        this.storeCode = storeCode;
    }

    public String getStoreName() {
        return storeName;
    }

    public void setStoreName(String storeName) {
        this.storeName = storeName;
    }

    public String getDate() {
        return date;
    }

    public void setDate(String date) {
        this.date = date;
    }

    public String getBillNumber() {
        return billNumber;
    }

    public void setBillNumber(String billNumber) {
        this.billNumber = billNumber;
    }

    public String getStatus() {
        return status;
    }

    public void setStatus(String status) {
        this.status = status;
    }

    public String getPartyInvoiceNo() {
        return partyInvoiceNo;
    }

    public void setPartyInvoiceNo(String partyInvoiceNo) {
        this.partyInvoiceNo = partyInvoiceNo;
    }

    public String getSupplierName() {
        return supplierName;
    }

    public void setSupplierName(String supplierName) {
        this.supplierName = supplierName;
    }

    public String getPurchaseLedgerCode() {
        return purchaseLedgerCode;
    }

    public void setPurchaseLedgerCode(String purchaseLedgerCode) {
        this.purchaseLedgerCode = purchaseLedgerCode;
    }

    public String getPurchaseLedgerName() {
        return purchaseLedgerName;
    }

    public void setPurchaseLedgerName(String purchaseLedgerName) {
        this.purchaseLedgerName = purchaseLedgerName;
    }

    public Integer getTotalQuantity() {
        return totalQuantity;
    }

    public void setTotalQuantity(Integer totalQuantity) {
        this.totalQuantity = totalQuantity;
    }

    public Double getAmount() {
        return amount;
    }

    public void setAmount(Double amount) {
        this.amount = amount;
    }
}
