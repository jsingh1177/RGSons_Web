package MJC.RGSons.dto;

public class StockTransferDetailRowDTO {
    private String districtName;
    private String date;
    private String fromStore;
    private String toStore;
    private String stoNumber;
    private String receivedStatus;
    private String itemCode;
    private String itemName;
    private String sizeCode;
    private String sizeName;
    private Integer quantity;

    public StockTransferDetailRowDTO(String districtName, String date, String fromStore, String toStore, String stoNumber, String receivedStatus,
                                     String itemCode, String itemName, String sizeCode, String sizeName, Integer quantity) {
        this.districtName = districtName;
        this.date = date;
        this.fromStore = fromStore;
        this.toStore = toStore;
        this.stoNumber = stoNumber;
        this.receivedStatus = receivedStatus;
        this.itemCode = itemCode;
        this.itemName = itemName;
        this.sizeCode = sizeCode;
        this.sizeName = sizeName;
        this.quantity = quantity;
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

    public String getStoNumber() {
        return stoNumber;
    }

    public void setStoNumber(String stoNumber) {
        this.stoNumber = stoNumber;
    }

    public String getReceivedStatus() {
        return receivedStatus;
    }

    public void setReceivedStatus(String receivedStatus) {
        this.receivedStatus = receivedStatus;
    }

    public String getItemCode() {
        return itemCode;
    }

    public void setItemCode(String itemCode) {
        this.itemCode = itemCode;
    }

    public String getItemName() {
        return itemName;
    }

    public void setItemName(String itemName) {
        this.itemName = itemName;
    }

    public String getSizeCode() {
        return sizeCode;
    }

    public void setSizeCode(String sizeCode) {
        this.sizeCode = sizeCode;
    }

    public String getSizeName() {
        return sizeName;
    }

    public void setSizeName(String sizeName) {
        this.sizeName = sizeName;
    }

    public Integer getQuantity() {
        return quantity;
    }

    public void setQuantity(Integer quantity) {
        this.quantity = quantity;
    }
}
