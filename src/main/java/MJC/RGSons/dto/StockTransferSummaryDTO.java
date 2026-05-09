package MJC.RGSons.dto;

public class StockTransferSummaryDTO {
    private String districtName;
    private String date;
    private String stoNumber;
    private String fromStore;
    private String toStore;
    private Integer totalQty;
    private Double amount;
    private String receivedStatus;

    public StockTransferSummaryDTO(String districtName, String date, String fromStore, String toStore, Integer totalQty, Double amount, String receivedStatus) {
        this.districtName = districtName;
        this.date = date;
        this.fromStore = fromStore;
        this.toStore = toStore;
        this.totalQty = totalQty;
        this.amount = amount;
        this.receivedStatus = receivedStatus;
    }

    public StockTransferSummaryDTO(String districtName, String date, String stoNumber, String fromStore, String toStore, Integer totalQty, Double amount, String receivedStatus) {
        this.districtName = districtName;
        this.date = date;
        this.stoNumber = stoNumber;
        this.fromStore = fromStore;
        this.toStore = toStore;
        this.totalQty = totalQty;
        this.amount = amount;
        this.receivedStatus = receivedStatus;
    }

    public String getDistrictName() {
        return districtName;
    }

    public void setDistrictName(String districtName) {
        this.districtName = districtName;
    }

    public String getDate() {
        return date;
    }

    public void setDate(String date) {
        this.date = date;
    }

    public String getStoNumber() {
        return stoNumber;
    }

    public void setStoNumber(String stoNumber) {
        this.stoNumber = stoNumber;
    }

    public String getFromStore() {
        return fromStore;
    }

    public void setFromStore(String fromStore) {
        this.fromStore = fromStore;
    }

    public String getToStore() {
        return toStore;
    }

    public void setToStore(String toStore) {
        this.toStore = toStore;
    }

    public Integer getTotalQty() {
        return totalQty;
    }

    public void setTotalQty(Integer totalQty) {
        this.totalQty = totalQty;
    }

    public Double getAmount() {
        return amount;
    }

    public void setAmount(Double amount) {
        this.amount = amount;
    }

    public String getReceivedStatus() {
        return receivedStatus;
    }

    public void setReceivedStatus(String receivedStatus) {
        this.receivedStatus = receivedStatus;
    }
}
