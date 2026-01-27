package MJC.RGSons.service;

import MJC.RGSons.model.InventoryMaster;
import MJC.RGSons.repository.InventoryMasterRepository;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;
import java.util.Optional;

@Service
public class InventoryService {

    @Autowired
    private InventoryMasterRepository inventoryMasterRepository;

    public List<InventoryMaster> getAllInventory() {
        return inventoryMasterRepository.findAll();
    }

    public List<InventoryMaster> getInventoryByItemCode(String itemCode) {
        return inventoryMasterRepository.findByItemCode(itemCode);
    }

    public Integer getClosingStock(String storeCode, String itemCode, String sizeCode) {
        Optional<InventoryMaster> inv = inventoryMasterRepository.findByStoreCodeAndItemCodeAndSizeCode(storeCode, itemCode, sizeCode);
        return inv.map(InventoryMaster::getClosing).orElse(0);
    }

    @Transactional
    public List<InventoryMaster> saveInventory(List<InventoryMaster> inventoryList) {
        for (InventoryMaster inv : inventoryList) {
            // Default store code if not present (assuming single store or default store for now)
            // In a multi-store environment, storeCode should be passed from frontend or context
            String storeCode = inv.getStoreCode();
            if (storeCode == null || storeCode.isEmpty()) {
                storeCode = "STORE001"; // Default or handle appropriately
                inv.setStoreCode(storeCode);
            }

            Optional<InventoryMaster> existingInv = inventoryMasterRepository.findByStoreCodeAndItemCodeAndSizeCode(
                    storeCode, inv.getItemCode(), inv.getSizeCode());

            if (existingInv.isPresent()) {
                InventoryMaster update = existingInv.get();
                // Update Opening stock
                if (inv.getBusinessDate() != null) {
                    update.setBusinessDate(inv.getBusinessDate());
                }

                if (inv.getOpening() != null) {
                    int oldOpening = update.getOpening() != null ? update.getOpening() : 0;
                    int oldClosing = update.getClosing() != null ? update.getClosing() : 0;
                    int newOpening = inv.getOpening();
                    
                    update.setOpening(newOpening);
                    // Recalculate Closing based on delta: Closing - Previous Opening + new Opening
                    update.setClosing(oldClosing - oldOpening + newOpening);
                }
                
                inventoryMasterRepository.save(update);
            } else {
                // New record
                if (inv.getInward() == null) inv.setInward(0);
                if (inv.getOutward() == null) inv.setOutward(0);
                
                int opening = inv.getOpening() != null ? inv.getOpening() : 0;
                inv.setClosing(opening + inv.getInward() - inv.getOutward());
                
                inventoryMasterRepository.save(inv);
            }
        }
        return inventoryList;
    }
}
