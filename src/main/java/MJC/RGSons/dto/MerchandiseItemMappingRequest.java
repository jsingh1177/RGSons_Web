package MJC.RGSons.dto;

import java.util.ArrayList;
import java.util.List;

public class MerchandiseItemMappingRequest {

    private List<String> itemCodes = new ArrayList<>();

    public List<String> getItemCodes() {
        return itemCodes;
    }

    public void setItemCodes(List<String> itemCodes) {
        this.itemCodes = itemCodes;
    }
}
