package MJC.RGSons.controller;

import MJC.RGSons.model.Item;
import MJC.RGSons.model.Brand;
import MJC.RGSons.model.Category;
import MJC.RGSons.model.PriceMaster;
import MJC.RGSons.model.OpeningBalance;
import MJC.RGSons.model.Size;
import MJC.RGSons.model.Store;
import MJC.RGSons.repository.OpeningBalanceRepository;
import MJC.RGSons.repository.StoreRepository;
import MJC.RGSons.service.SalesService;
import MJC.RGSons.service.BrandService;
import MJC.RGSons.service.CategoryService;
import MJC.RGSons.service.PriceMasterService;
import MJC.RGSons.service.SizeService;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.CrossOrigin;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.util.ArrayList;
import java.util.Comparator;
import java.util.HashMap;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.function.Function;
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
    private OpeningBalanceRepository openingBalanceRepository;

    @Autowired
    private StoreRepository storeRepository;

    @Autowired
    private SizeService sizeService;

    @GetMapping("/ItemList")
    public ResponseEntity<Map<String, Object>> getItemList() {
        Map<String, Object> response = new LinkedHashMap<>();
        List<Item> items = salesService.getAllItems();
        List<PriceMaster> prices = priceMasterService.getAllPrices();
        List<OpeningBalance> openingBalances = openingBalanceRepository.findAll();
        
        // Group prices by itemCode
        Map<String, List<PriceMaster>> pricesByItem = prices.stream()
            .collect(Collectors.groupingBy(PriceMaster::getItemCode));

        Comparator<OpeningBalance> openingBalanceComparator = Comparator
                .comparing(OpeningBalance::getTranDate, Comparator.nullsLast(Comparator.naturalOrder()))
                .thenComparing(OpeningBalance::getUpdatedAt, Comparator.nullsLast(Comparator.naturalOrder()))
                .thenComparing(OpeningBalance::getCreatedAt, Comparator.nullsLast(Comparator.naturalOrder()))
                .thenComparing(OpeningBalance::getId, Comparator.nullsLast(Comparator.naturalOrder()));

        Function<OpeningBalance, String> itemSizeKey = ob ->
                (ob.getItemCode() != null ? ob.getItemCode() : "") + "_" + (ob.getSizeCode() != null ? ob.getSizeCode() : "");

        Function<OpeningBalance, String> storeKey = ob -> ob.getStoreCode() != null ? ob.getStoreCode() : "";

        Map<String, Map<String, OpeningBalance>> openingByItemSizeAndStore = new HashMap<>();
        if (openingBalances != null && !openingBalances.isEmpty()) {
            openingByItemSizeAndStore = openingBalances.stream()
                    .filter(ob -> ob != null && ob.getItemCode() != null)
                    .collect(Collectors.groupingBy(
                            itemSizeKey,
                            Collectors.toMap(
                                    storeKey,
                                    Function.identity(),
                                    (a, b) -> openingBalanceComparator.compare(a, b) >= 0 ? a : b
                            )
                    ));
        }
        
        // Fetch all brands and categories for name lookup
        Map<String, String> brandNames = brandService.getAllBrands().stream()
            .collect(Collectors.toMap(Brand::getCode, Brand::getName, (a, b) -> a));
            
        Map<String, String> categoryNames = categoryService.getAllCategories().stream()
            .collect(Collectors.toMap(Category::getCode, Category::getName, (a, b) -> a));

        Map<String, String> storeNames = storeRepository.findAll().stream()
            .collect(Collectors.toMap(Store::getStoreCode, Store::getStoreName, (a, b) -> a));
        
        List<Map<String, Object>> formattedItems = new ArrayList<>();
        
        for (Item item : items) {
            List<PriceMaster> itemPrices = pricesByItem.get(item.getItemCode());
            
            if (itemPrices != null && !itemPrices.isEmpty()) {
                for (PriceMaster pm : itemPrices) {
                    Map<String, Object> map = new LinkedHashMap<>();
                    map.put("itemCode", item.getItemCode());
                    map.put("itemName", item.getItemName());
                    map.put("sizeCode", pm.getSizeCode());
                    map.put("sizeName", pm.getSizeName());
                    map.put("brandCode", item.getBrandCode());
                    map.put("brandName", brandNames.getOrDefault(item.getBrandCode(), ""));
                    map.put("categoryCode", item.getCategoryCode());
                    map.put("categoryName", categoryNames.getOrDefault(item.getCategoryCode(), ""));
                    map.put("purchasePrice", pm.getPurchasePrice());
                    map.put("salePrice", pm.getSalePrice());
                    map.put("mrp", pm.getMrp());
                    map.put("status", item.getStatus());
                    
                    // Inventory Details
                    String invKey = item.getItemCode() + "_" + (pm.getSizeCode() != null ? pm.getSizeCode() : "");
                    List<Map<String, Object>> inventoryDetails = new ArrayList<>();
                    int totalOpeningQty = 0;
                    Double priceForAmount = pm.getPurchasePrice();
                    
                    Map<String, OpeningBalance> storeToOpening = openingByItemSizeAndStore.get(invKey);
                    if (storeToOpening != null && !storeToOpening.isEmpty()) {
                        for (Map.Entry<String, OpeningBalance> e : storeToOpening.entrySet().stream()
                                .sorted(Map.Entry.comparingByKey(String.CASE_INSENSITIVE_ORDER))
                                .toList()) {
                            OpeningBalance ob = e.getValue();
                            Map<String, Object> invMap = new LinkedHashMap<>();
                            String storeCode = ob != null ? ob.getStoreCode() : null;
                            invMap.put("store_code", storeCode);
                            String storeName = storeNames.get(storeCode);
                            if (storeName == null && storeCode != null) {
                                if ("HO".equalsIgnoreCase(storeCode) || "Head Office".equalsIgnoreCase(storeCode)) {
                                    storeName = storeNames.getOrDefault("HO", "Head Office");
                                }
                            }
                            invMap.put("store_name", storeName != null ? storeName : "");
                            Integer opening = ob != null ? ob.getOpening() : null;
                            invMap.put("Opening", opening);
                            invMap.put("Price", pm.getPurchasePrice());
                            inventoryDetails.add(invMap);
                            if (opening != null) {
                                totalOpeningQty += opening;
                            }
                        }
                    }
                    map.put("Total_Openong_Qty", totalOpeningQty);
                    map.put("Total_Amount", totalOpeningQty * (priceForAmount != null ? priceForAmount : 0.0));
                    map.put("InventoryDetails", inventoryDetails);

                    formattedItems.add(map);
                }
            } else {
                // Fallback for items without PriceMaster entries
                Map<String, Object> map = new LinkedHashMap<>();
                map.put("itemCode", item.getItemCode());
                map.put("itemName", item.getItemName());
                map.put("sizeCode", "");
                map.put("sizeName", item.getSize());
                map.put("brandCode", item.getBrandCode());
                map.put("brandName", brandNames.getOrDefault(item.getBrandCode(), ""));
                map.put("categoryCode", item.getCategoryCode());
                map.put("categoryName", categoryNames.getOrDefault(item.getCategoryCode(), ""));
                map.put("purchasePrice", item.getPurchasePrice());
                map.put("salePrice", null);
                map.put("mrp", item.getMrp());
                map.put("status", item.getStatus());

                // Inventory Details (using empty size code for fallback if applicable)
                String invKey = item.getItemCode() + "_";
                List<Map<String, Object>> inventoryDetails = new ArrayList<>();
                int totalOpeningQty = 0;
                Double priceForAmount = item.getPurchasePrice();
                
                Map<String, OpeningBalance> storeToOpening = openingByItemSizeAndStore.get(invKey);
                if (storeToOpening != null && !storeToOpening.isEmpty()) {
                    for (Map.Entry<String, OpeningBalance> e : storeToOpening.entrySet().stream()
                            .sorted(Map.Entry.comparingByKey(String.CASE_INSENSITIVE_ORDER))
                            .toList()) {
                        OpeningBalance ob = e.getValue();
                        Map<String, Object> invMap = new LinkedHashMap<>();
                        String storeCode = ob != null ? ob.getStoreCode() : null;
                        invMap.put("store_code", storeCode);
                        String storeName = storeNames.get(storeCode);
                        if (storeName == null && storeCode != null) {
                            if ("HO".equalsIgnoreCase(storeCode) || "Head Office".equalsIgnoreCase(storeCode)) {
                                storeName = storeNames.getOrDefault("HO", "Head Office");
                            }
                        }
                        invMap.put("store_name", storeName != null ? storeName : "");
                        Integer opening = ob != null ? ob.getOpening() : null;
                        invMap.put("Opening", opening);
                        invMap.put("Price", item.getPurchasePrice());
                        inventoryDetails.add(invMap);
                        if (opening != null) {
                            totalOpeningQty += opening;
                        }
                    }
                }
                map.put("Total_Openong_Qty", totalOpeningQty);
                map.put("Total_Amount", totalOpeningQty * (priceForAmount != null ? priceForAmount : 0.0));
                map.put("InventoryDetails", inventoryDetails);
                
                formattedItems.add(map);
            }
        }

        response.put("ItemList", formattedItems);
        return ResponseEntity.ok(response);
    }

    @GetMapping("/ItemOpBal")
    public ResponseEntity<Map<String, Object>> getItemOpBal() {
        Map<String, Object> response = new LinkedHashMap<>();

        List<OpeningBalance> openingBalances = openingBalanceRepository.findAll();
        List<Item> items = salesService.getAllItems();
        List<Size> sizes = sizeService.getAllSizes();

        Map<String, String> storeNames = storeRepository.findAll().stream()
                .collect(Collectors.toMap(Store::getStoreCode, Store::getStoreName, (a, b) -> a));

        Map<String, String> itemNames = (items != null ? items : List.<Item>of()).stream()
                .filter(i -> i != null && i.getItemCode() != null)
                .collect(Collectors.toMap(Item::getItemCode, i -> i.getItemName() != null ? i.getItemName() : "", (a, b) -> a));

        Map<String, String> sizeNames = (sizes != null ? sizes : List.<Size>of()).stream()
                .filter(s -> s != null && s.getCode() != null)
                .collect(Collectors.toMap(Size::getCode, s -> s.getName() != null ? s.getName() : s.getCode(), (a, b) -> a));

        Comparator<OpeningBalance> openingBalanceComparator = Comparator
                .comparing(OpeningBalance::getTranDate, Comparator.nullsLast(Comparator.naturalOrder()))
                .thenComparing(OpeningBalance::getUpdatedAt, Comparator.nullsLast(Comparator.naturalOrder()))
                .thenComparing(OpeningBalance::getCreatedAt, Comparator.nullsLast(Comparator.naturalOrder()))
                .thenComparing(OpeningBalance::getId, Comparator.nullsLast(Comparator.naturalOrder()));

        Map<String, OpeningBalance> latestByStoreItemSize = new HashMap<>();
        if (openingBalances != null) {
            for (OpeningBalance ob : openingBalances) {
                if (ob == null) continue;
                String storeCode = ob.getStoreCode() != null ? ob.getStoreCode() : "";
                String itemCode = ob.getItemCode() != null ? ob.getItemCode() : "";
                String sizeCode = ob.getSizeCode() != null ? ob.getSizeCode() : "";
                if (itemCode.isBlank()) continue;
                String key = storeCode + "|" + itemCode + "|" + sizeCode;
                OpeningBalance existing = latestByStoreItemSize.get(key);
                if (existing == null || openingBalanceComparator.compare(ob, existing) >= 0) {
                    latestByStoreItemSize.put(key, ob);
                }
            }
        }

        Map<String, List<OpeningBalance>> byStore = latestByStoreItemSize.values().stream()
                .collect(Collectors.groupingBy(ob -> ob.getStoreCode() != null ? ob.getStoreCode() : ""));

        List<Map<String, Object>> storeList = new ArrayList<>();
        for (String storeCode : byStore.keySet().stream().sorted(String.CASE_INSENSITIVE_ORDER).toList()) {
            List<OpeningBalance> obs = byStore.get(storeCode);
            if (obs == null || obs.isEmpty()) continue;

            Map<String, Object> storeMap = new LinkedHashMap<>();
            storeMap.put("store_code", storeCode);

            String storeName = storeNames.get(storeCode);
            if (storeName == null && storeCode != null) {
                if ("HO".equalsIgnoreCase(storeCode) || "Head Office".equalsIgnoreCase(storeCode)) {
                    storeName = storeNames.getOrDefault("HO", "Head Office");
                }
            }
            storeMap.put("store_name", storeName != null ? storeName : "");

            List<Map<String, Object>> itemDetails = obs.stream()
                    .sorted(Comparator
                            .comparing((OpeningBalance ob) -> itemNames.getOrDefault(ob.getItemCode(), ""), String.CASE_INSENSITIVE_ORDER)
                            .thenComparing(ob -> ob.getItemCode() != null ? ob.getItemCode() : "", String.CASE_INSENSITIVE_ORDER)
                            .thenComparing(ob -> sizeNames.getOrDefault(ob.getSizeCode(), ob.getSizeCode() != null ? ob.getSizeCode() : ""), String.CASE_INSENSITIVE_ORDER)
                            .thenComparing(ob -> ob.getSizeCode() != null ? ob.getSizeCode() : "", String.CASE_INSENSITIVE_ORDER)
                    )
                    .map(ob -> {
                        Map<String, Object> m = new LinkedHashMap<>();
                        String itemCode = ob.getItemCode() != null ? ob.getItemCode() : "";
                        String sizeCode = ob.getSizeCode() != null ? ob.getSizeCode() : "";
                        int opening = ob.getOpening() != null ? ob.getOpening() : 0;
                        double price = ob.getPurchasePrice() != null ? ob.getPurchasePrice() : 0.0;
                        m.put("itemCode", itemCode);
                        m.put("itemName", itemNames.getOrDefault(itemCode, ""));
                        m.put("sizeCode", sizeCode);
                        m.put("sizeName", sizeNames.getOrDefault(sizeCode, sizeCode));
                        m.put("Opening", opening);
                        m.put("Price", price);
                        m.put("Amount", opening * price);
                        return m;
                    })
                    .toList();

            storeMap.put("ItemDetails", itemDetails);
            storeList.add(storeMap);
        }

        response.put("GodownList", storeList);
        return ResponseEntity.ok(response);
    }
}
