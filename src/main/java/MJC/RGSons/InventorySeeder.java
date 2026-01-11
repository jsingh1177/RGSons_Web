package MJC.RGSons;

import MJC.RGSons.model.InventoryMaster;
import MJC.RGSons.model.PriceMaster;
import MJC.RGSons.model.Store;
import MJC.RGSons.repository.InventoryMasterRepository;
import MJC.RGSons.repository.PriceMasterRepository;
import MJC.RGSons.repository.StoreRepository;
import org.springframework.boot.CommandLineRunner;
import org.springframework.stereotype.Component;

import java.util.Arrays;
import java.util.List;

@Component
public class InventorySeeder implements CommandLineRunner {

    private final InventoryMasterRepository inventoryMasterRepository;
    private final PriceMasterRepository priceMasterRepository;
    private final StoreRepository storeRepository;

    public InventorySeeder(InventoryMasterRepository inventoryMasterRepository, 
                      PriceMasterRepository priceMasterRepository,
                      StoreRepository storeRepository) {
        this.inventoryMasterRepository = inventoryMasterRepository;
        this.priceMasterRepository = priceMasterRepository;
        this.storeRepository = storeRepository;
    }

    @Override
    public void run(String... args) throws Exception {
        seedPriceMaster();
        seedInventoryMaster();
    }

    private void seedPriceMaster() {
        if (priceMasterRepository.count() == 0) {
            System.out.println("Seeding PriceMaster...");
            PriceMaster p1 = new PriceMaster();
            p1.setItemCode("ITEM001");
            p1.setItemName("Test Item 1");
            p1.setSizeCode("SIZE001");
            p1.setSizeName("750ML");
            p1.setPurchasePrice(100.0);
            p1.setMrp(150.0);
            
            PriceMaster p2 = new PriceMaster();
            p2.setItemCode("ITEM002");
            p2.setItemName("Test Item 2");
            p2.setSizeCode("SIZE002");
            p2.setSizeName("375ML");
            p2.setPurchasePrice(50.0);
            p2.setMrp(80.0);

            priceMasterRepository.saveAll(Arrays.asList(p1, p2));
        }
    }

    private void seedInventoryMaster() {
        // Seed for all stores
        List<Store> stores = storeRepository.findAll();
        if (stores.isEmpty()) {
            System.out.println("No stores found to seed inventory for.");
            return;
        }

        for (Store store : stores) {
            String storeCode = store.getStoreCode();
            // Check if store already has inventory
            if (inventoryMasterRepository.findByStoreCode(storeCode).isEmpty()) {
                System.out.println("Seeding Inventory for Store: " + storeCode);
                
                InventoryMaster i1 = new InventoryMaster();
                i1.setStoreCode(storeCode);
                i1.setItemCode("ITEM001");
                i1.setItemName("Test Item 1");
                i1.setSizeCode("SIZE001");
                i1.setSizeName("750ML");
                i1.setOpening(10);
                i1.setClosing(10); 
                
                InventoryMaster i2 = new InventoryMaster();
                i2.setStoreCode(storeCode);
                i2.setItemCode("ITEM002");
                i2.setItemName("Test Item 2");
                i2.setSizeCode("SIZE002");
                i2.setSizeName("375ML");
                i2.setOpening(20);
                i2.setClosing(20);

                inventoryMasterRepository.saveAll(Arrays.asList(i1, i2));
            }
        }
    }
}
