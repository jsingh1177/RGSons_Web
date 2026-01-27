package MJC.RGSons.service;

import MJC.RGSons.dto.DSRSaveRequest;
import MJC.RGSons.model.DSR;
import MJC.RGSons.model.DSRHead;
import MJC.RGSons.model.InventoryMaster;
import MJC.RGSons.model.PriceMaster;
import MJC.RGSons.model.StiItem;
import MJC.RGSons.model.StoItem;
import MJC.RGSons.repository.DSRHeadRepository;
import MJC.RGSons.repository.DSRRepository;
import MJC.RGSons.repository.InventoryMasterRepository;
import MJC.RGSons.repository.PriceMasterRepository;
import MJC.RGSons.repository.StiItemRepository;
import MJC.RGSons.repository.StoItemRepository;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.Optional;

@Service
public class DSRService {

    @Autowired
    private DSRRepository dsrRepository;

    @Autowired
    private DSRHeadRepository dsrHeadRepository;

    @Autowired
    private InventoryMasterRepository inventoryMasterRepository;

    @Autowired
    private PriceMasterRepository priceMasterRepository;

    @Autowired
    private StiItemRepository stiItemRepository;

    @Autowired
    private StoItemRepository stoItemRepository;

    public String getDSRStatus(String storeCode, String date) {
        Optional<DSRHead> headOpt = dsrHeadRepository.findByStoreCodeAndDsrDate(storeCode, date);
        if (headOpt.isPresent()) {
            return headOpt.get().getDsrStatus();
        }
        return "PENDING";
    }

    @Transactional
    public void saveDSR(DSRSaveRequest request) {
        System.out.println("Saving DSR with request: " + request);
        if (request != null) {
            System.out.println("StoreCode: " + request.getStoreCode());
            System.out.println("DsrDate: " + request.getDsrDate());
        }

        if (dsrHeadRepository == null) {
            throw new IllegalStateException("dsrHeadRepository is null");
        }
        if (request == null) {
            throw new IllegalArgumentException("Request body is null");
        }
        if (request.getStoreCode() == null || request.getStoreCode().isEmpty()) {
            throw new IllegalArgumentException("Store Code is required");
        }
        if (request.getDsrDate() == null || request.getDsrDate().isEmpty()) {
            throw new IllegalArgumentException("DSR Date is required");
        }

        // 1. Save or Update DSR Head
        Optional<DSRHead> headOpt = dsrHeadRepository.findByStoreCodeAndDsrDate(request.getStoreCode(), request.getDsrDate());
        DSRHead head;
        if (headOpt.isPresent()) {
            head = headOpt.get();
            head.setUpdatedAt(LocalDateTime.now());
        } else {
            head = new DSRHead();
            head.setStoreCode(request.getStoreCode());
            head.setDsrDate(request.getDsrDate());
            head.setCreatedAt(LocalDateTime.now());
            head.setUpdatedAt(LocalDateTime.now());
        }
        head.setUserName(request.getUserName());
        head.setDsrStatus("SUBMITTED");
        dsrHeadRepository.save(head);

        // 2. Update DSR Details
        if (request.getDetails() != null) {
            for (DSRSaveRequest.DSRDetailRequest detailReq : request.getDetails()) {
                Optional<DSR> dsrOpt = Optional.empty();
                
                if (detailReq.getId() != null) {
                    dsrOpt = dsrRepository.findById(detailReq.getId());
                } else if (detailReq.getItemCode() != null && detailReq.getSizeCode() != null) {
                    dsrOpt = dsrRepository.findByStoreAndBusinessDateAndItemCodeAndSizeCode(
                            request.getStoreCode(), request.getDsrDate(), detailReq.getItemCode(), detailReq.getSizeCode());
                }

                if (dsrOpt.isPresent()) {
                    DSR dsr = dsrOpt.get();
                    
                    // Update fields
                    if (detailReq.getInward() != null) dsr.setInward(detailReq.getInward());
                    if (detailReq.getOutward() != null) dsr.setOutward(detailReq.getOutward());
                    if (detailReq.getSale() != null) dsr.setSale(detailReq.getSale());
                    
                    // Recalculate Closing
                    // Closing = Opening + Inward - Outward - Sale
                    int opening = dsr.getOpening() != null ? dsr.getOpening() : 0;
                    int inward = dsr.getInward() != null ? dsr.getInward() : 0;
                    int outward = dsr.getOutward() != null ? dsr.getOutward() : 0;
                    int sale = dsr.getSale() != null ? dsr.getSale() : 0;
                    
                    dsr.setClosing(opening + inward - outward - sale);
                    dsr.setUpdatedAt(LocalDateTime.now());
                    
                    dsrRepository.save(dsr);
                } else if (detailReq.getItemCode() != null && detailReq.getSizeCode() != null) {
                    // Record not found, insert new record
                    Optional<InventoryMaster> invOpt = inventoryMasterRepository.findByStoreCodeAndItemCodeAndSizeCode(
                            request.getStoreCode(), detailReq.getItemCode(), detailReq.getSizeCode());
                    
                    if (invOpt.isPresent()) {
                        InventoryMaster inventory = invOpt.get();
                        DSR dsr = new DSR();
                        dsr.setStore(request.getStoreCode());
                        dsr.setBusinessDate(request.getDsrDate());
                        dsr.setItemCode(inventory.getItemCode());
                        dsr.setItemName(inventory.getItemName());
                        dsr.setSizeCode(inventory.getSizeCode());
                        dsr.setSizeName(inventory.getSizeName());
                        
                        // Closing from Inventory becomes Opening in DSR
                        dsr.setOpening(inventory.getClosing()); 
                        
                        // Initialize with request values or 0
                        dsr.setInward(detailReq.getInward() != null ? detailReq.getInward() : 0);
                        dsr.setOutward(detailReq.getOutward() != null ? detailReq.getOutward() : 0);
                        dsr.setSale(detailReq.getSale() != null ? detailReq.getSale() : 0);
                        
                        // Calculate Closing
                        dsr.setClosing(dsr.getOpening() + dsr.getInward() - dsr.getOutward() - dsr.getSale());

                        // Fetch Price details
                        Optional<PriceMaster> priceOpt = priceMasterRepository.findByItemCodeAndSizeCode(inventory.getItemCode(), inventory.getSizeCode());
                        if (priceOpt.isPresent()) {
                            PriceMaster price = priceOpt.get();
                            dsr.setPurchasePrice(price.getPurchasePrice());
                            dsr.setMrp(price.getMrp());
                        } else {
                            dsr.setPurchasePrice(0.0);
                            dsr.setMrp(0.0);
                        }

                        dsr.setCreatedAt(LocalDateTime.now());
                        dsr.setUpdatedAt(LocalDateTime.now());

                        dsrRepository.save(dsr);
                    }
                }
            }
        }
    }

    public void populateDSR(String storeCode, String businessDate, String userName) {
        System.out.println("populateDSR called for Store: " + storeCode + ", Date: " + businessDate + ", User: " + userName);
        // 0. Create DSR Head if not exists
        Optional<DSRHead> headOpt = dsrHeadRepository.findByStoreCodeAndDsrDate(storeCode, businessDate);
        if (headOpt.isEmpty()) {
            System.out.println("Creating new DSR Head...");
            DSRHead head = new DSRHead();
            head.setStoreCode(storeCode);
            head.setDsrDate(businessDate);
            head.setUserName(userName);
            head.setDsrStatus("NEW");
            head.setCreatedAt(LocalDateTime.now());
            head.setUpdatedAt(LocalDateTime.now());
            dsrHeadRepository.save(head);
            System.out.println("DSR Head created with ID: " + head.getId());
        } else {
            System.out.println("DSR Head already exists: " + headOpt.get().getId());
            DSRHead head = headOpt.get();
            // Update username if it was null or different (and new username is provided)
            if (userName != null && !userName.isEmpty() && 
                (head.getUserName() == null || !head.getUserName().equals(userName))) {
                head.setUserName(userName);
                head.setUpdatedAt(LocalDateTime.now());
                dsrHeadRepository.save(head);
                System.out.println("Updated DSR Head username to: " + userName);
            }
        }

        // Fetch all inventory items for the store
        // Note: InventoryMasterRepository needs a method to find by storeCode
        // Assuming findByStoreCode exists or we'll add it. 
        // Based on previous read, it only has findByStoreCodeAndItemCodeAndSizeCode.
        // I will need to update InventoryMasterRepository to include findByStoreCode.
        List<InventoryMaster> inventoryItems = inventoryMasterRepository.findByStoreCode(storeCode);
        System.out.println("Found " + inventoryItems.size() + " inventory items for store: " + storeCode);

        // Fetch STI Items for this store and date to populate Inward
        List<StiItem> stiItems = stiItemRepository.findByToStoreAndStiDate(storeCode, businessDate);
        System.out.println("Querying STI Items with Store: '" + storeCode + "' and Date: '" + businessDate + "'");
        System.out.println("Found " + stiItems.size() + " STI items for Inward population");
        
        Map<String, Integer> stiMap = new HashMap<>();
        for (StiItem sti : stiItems) {
            String key = sti.getItemCode() + "_" + sti.getSizeCode();
            stiMap.put(key, stiMap.getOrDefault(key, 0) + sti.getQuantity());
        }

        // Fetch STO Items for this store (FromStore) and date to populate Outward (Transfer)
        List<StoItem> stoItems = stoItemRepository.findByFromStoreAndStoDate(storeCode, businessDate);
        System.out.println("Querying STO Items with FromStore: '" + storeCode + "' and Date: '" + businessDate + "'");
        System.out.println("Found " + stoItems.size() + " STO items for Outward population");

        Map<String, Integer> stoMap = new HashMap<>();
        for (StoItem sto : stoItems) {
            String key = sto.getItemCode() + "_" + sto.getSizeCode();
            stoMap.put(key, stoMap.getOrDefault(key, 0) + sto.getQuantity());
        }

        for (InventoryMaster inventory : inventoryItems) {
            Optional<DSR> existingDsr = dsrRepository.findByStoreAndBusinessDateAndItemCodeAndSizeCode(
                storeCode, businessDate, inventory.getItemCode(), inventory.getSizeCode()
            );

            if (existingDsr.isPresent()) {
                System.out.println("DSR Detail already exists for Item: " + inventory.getItemCode() + ", Size: " + inventory.getSizeCode());
                // Update Inward and Outward if they differ
                DSR dsr = existingDsr.get();
                String key = inventory.getItemCode() + "_" + inventory.getSizeCode();
                
                int inwardQty = stiMap.getOrDefault(key, 0);
                int outwardQty = stoMap.getOrDefault(key, 0);
                
                boolean updated = false;
                if (dsr.getInward() == null || dsr.getInward() != inwardQty) {
                    System.out.println("Updating Inward for DSR Item: " + inventory.getItemCode() + " from " + dsr.getInward() + " to " + inwardQty);
                    dsr.setInward(inwardQty);
                    updated = true;
                }
                
                if (dsr.getOutward() == null || dsr.getOutward() != outwardQty) {
                    System.out.println("Updating Outward for DSR Item: " + inventory.getItemCode() + " from " + dsr.getOutward() + " to " + outwardQty);
                    dsr.setOutward(outwardQty);
                    updated = true;
                }
                
                if (updated) {
                    // Recalculate Closing
                    int opening = dsr.getOpening() != null ? dsr.getOpening() : 0;
                    int inward = dsr.getInward() != null ? dsr.getInward() : 0;
                    int outward = dsr.getOutward() != null ? dsr.getOutward() : 0;
                    int sale = dsr.getSale() != null ? dsr.getSale() : 0;
                    dsr.setClosing(opening + inward - outward - sale);
                    
                    dsr.setUpdatedAt(LocalDateTime.now());
                    dsrRepository.save(dsr);
                }
                continue;
            }

            DSR dsr = new DSR();
            dsr.setStore(storeCode);
            dsr.setBusinessDate(businessDate);
            dsr.setItemCode(inventory.getItemCode());
            dsr.setItemName(inventory.getItemName());
            dsr.setSizeCode(inventory.getSizeCode());
            dsr.setSizeName(inventory.getSizeName());
            
            // Closing from Inventory becomes Opening in DSR
            dsr.setOpening(inventory.getClosing() != null ? inventory.getClosing() : 0); 
            
            // Initialize other stock fields
            // Populate Inward from STI
            String key = inventory.getItemCode() + "_" + inventory.getSizeCode();
            int inwardQty = stiMap.getOrDefault(key, 0);
            dsr.setInward(inwardQty);
            
            // Populate Outward from STO
            int outwardQty = stoMap.getOrDefault(key, 0);
            dsr.setOutward(outwardQty);
            
            dsr.setSale(0);
            // Closing = Opening + Inward - Outward - Sale
            dsr.setClosing(dsr.getOpening() + dsr.getInward() - dsr.getOutward()); 
 

            // Fetch Price details
            Optional<PriceMaster> priceOpt = priceMasterRepository.findByItemCodeAndSizeCode(inventory.getItemCode(), inventory.getSizeCode());
            if (priceOpt.isPresent()) {
                PriceMaster price = priceOpt.get();
                dsr.setPurchasePrice(price.getPurchasePrice());
                dsr.setMrp(price.getMrp());
            } else {
                dsr.setPurchasePrice(0.0);
                dsr.setMrp(0.0);
            }

            dsr.setCreatedAt(LocalDateTime.now());
            dsr.setUpdatedAt(LocalDateTime.now());

            dsrRepository.save(dsr);
            System.out.println("Created DSR Detail for Item: " + inventory.getItemCode());
        }
    }
}
