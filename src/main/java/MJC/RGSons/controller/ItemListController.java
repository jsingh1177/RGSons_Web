package MJC.RGSons.controller;

import MJC.RGSons.model.Item;
import MJC.RGSons.model.Brand;
import MJC.RGSons.model.Category;
import MJC.RGSons.model.PriceMaster;
import MJC.RGSons.model.InventoryMaster;
import MJC.RGSons.service.SalesService;
import MJC.RGSons.service.BrandService;
import MJC.RGSons.service.CategoryService;
import MJC.RGSons.service.PriceMasterService;
import MJC.RGSons.service.InventoryService;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.CrossOrigin;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.util.ArrayList;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.stream.Collectors;

@RestController
@RequestMapping("/api")
@CrossOrigin(origins = "*")
public class ItemListController {

    @Autowired
    private SalesService salesService;

    @Autowired
    private BrandService brandService;

    @Autowired
    private CategoryService categoryService;

    @Autowired
    private PriceMasterService priceMasterService;

    @Autowired
    private InventoryService inventoryService;

    @GetMapping("/ItemList")
    public ResponseEntity<Map<String, Object>> getItemList() {
        Map<String, Object> response = new HashMap<>();
        List<Item> items = salesService.getAllItems();
        List<PriceMaster> prices = priceMasterService.getAllPrices();
        List<InventoryMaster> inventory = inventoryService.getAllInventory();
        
        // Group prices by itemCode
        Map<String, List<PriceMaster>> pricesByItem = prices.stream()
            .collect(Collectors.groupingBy(PriceMaster::getItemCode));

        // Group inventory by itemCode + sizeCode
        Map<String, List<InventoryMaster>> inventoryByItemAndSize = inventory.stream()
            .collect(Collectors.groupingBy(inv -> 
                inv.getItemCode() + "_" + (inv.getSizeCode() != null ? inv.getSizeCode() : "")
            ));
        
        // Fetch all brands and categories for name lookup
        Map<String, String> brandNames = brandService.getAllBrands().stream()
            .collect(Collectors.toMap(Brand::getCode, Brand::getName, (a, b) -> a));
            
        Map<String, String> categoryNames = categoryService.getAllCategories().stream()
            .collect(Collectors.toMap(Category::getCode, Category::getName, (a, b) -> a));
        
        List<Map<String, Object>> formattedItems = new ArrayList<>();
        
        for (Item item : items) {
            List<PriceMaster> itemPrices = pricesByItem.get(item.getItemCode());
            
            if (itemPrices != null && !itemPrices.isEmpty()) {
                for (PriceMaster pm : itemPrices) {
                    Map<String, Object> map = new HashMap<>();
                    map.put("itemCode", item.getItemCode());
                    map.put("itemName", item.getItemName());
                    map.put("brandCode", item.getBrandCode());
                    map.put("brandName", brandNames.getOrDefault(item.getBrandCode(), ""));
                    map.put("categoryCode", item.getCategoryCode());
                    map.put("categoryName", categoryNames.getOrDefault(item.getCategoryCode(), ""));
                    map.put("status", item.getStatus());
                    
                    // Fields from PriceMaster
                    map.put("sizeCode", pm.getSizeCode());
                    map.put("sizeName", pm.getSizeName());
                    map.put("purchasePrice", pm.getPurchasePrice());
                    map.put("mrp", pm.getMrp());
                    
                    // Inventory Details
                    String invKey = item.getItemCode() + "_" + (pm.getSizeCode() != null ? pm.getSizeCode() : "");
                    List<InventoryMaster> invList = inventoryByItemAndSize.get(invKey);
                    List<Map<String, Object>> inventoryDetails = new ArrayList<>();
                    
                    if (invList != null) {
                        for (InventoryMaster inv : invList) {
                            Map<String, Object> invMap = new HashMap<>();
                            invMap.put("store_code", inv.getStoreCode());
                            invMap.put("Opening", inv.getOpening());
                            inventoryDetails.add(invMap);
                        }
                    }
                    map.put("InventoryDetails", inventoryDetails);

                    formattedItems.add(map);
                }
            } else {
                // Fallback for items without PriceMaster entries
                Map<String, Object> map = new HashMap<>();
                map.put("itemCode", item.getItemCode());
                map.put("itemName", item.getItemName());
                map.put("brandCode", item.getBrandCode());
                map.put("brandName", brandNames.getOrDefault(item.getBrandCode(), ""));
                map.put("categoryCode", item.getCategoryCode());
                map.put("categoryName", categoryNames.getOrDefault(item.getCategoryCode(), ""));
                map.put("status", item.getStatus());
                
                // Use Item defaults
                map.put("sizeCode", "");
                map.put("sizeName", item.getSize());
                map.put("purchasePrice", item.getPurchasePrice());
                map.put("mrp", item.getMrp());

                // Inventory Details (using empty size code for fallback if applicable)
                String invKey = item.getItemCode() + "_";
                List<InventoryMaster> invList = inventoryByItemAndSize.get(invKey);
                List<Map<String, Object>> inventoryDetails = new ArrayList<>();
                
                if (invList != null) {
                    for (InventoryMaster inv : invList) {
                        Map<String, Object> invMap = new HashMap<>();
                        invMap.put("store_code", inv.getStoreCode());
                        invMap.put("Opening", inv.getOpening());
                        inventoryDetails.add(invMap);
                    }
                }
                map.put("InventoryDetails", inventoryDetails);
                
                formattedItems.add(map);
            }
        }

        response.put("ItemList", formattedItems);
        return ResponseEntity.ok(response);
    }
}
