package MJC.RGSons.dto;

public class DsrStatusDTO {
    private String districtName;
    private String shopType;
    private String owner;
    private String storeCode;
    private String storeName;
    private String date;
    private Integer status;

    public DsrStatusDTO(String districtName, String shopType, String owner, String storeCode, String storeName, String date, Integer status) {
        this.districtName = districtName;
        this.shopType = shopType;
        this.owner = owner;
        this.storeCode = storeCode;
        this.storeName = storeName;
        this.date = date;
        this.status = status;
    }

    public String getDistrictName() {
        return districtName;
    }

    public void setDistrictName(String districtName) {
        this.districtName = districtName;
    }

    public String getShopType() {
        return shopType;
    }

    public void setShopType(String shopType) {
        this.shopType = shopType;
    }

    public String getOwner() {
        return owner;
    }

    public void setOwner(String owner) {
        this.owner = owner;
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

    public Integer getStatus() {
        return status;
    }

    public void setStatus(Integer status) {
        this.status = status;
    }
}
