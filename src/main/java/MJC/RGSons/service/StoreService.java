package MJC.RGSons.service;

import MJC.RGSons.model.Store;
import MJC.RGSons.repository.StoreRepository;
import MJC.RGSons.repository.TranHeadRepository;
import MJC.RGSons.repository.PurHeadRepository;
import MJC.RGSons.repository.StoHeadRepository;
import MJC.RGSons.model.UserStoreMap;
import MJC.RGSons.repository.UserStoreMapRepository;
import org.springframework.data.domain.Example;
import org.springframework.data.domain.ExampleMatcher;
import java.util.stream.Collectors;
import java.util.ArrayList;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;

import java.time.LocalDateTime;
import java.util.List;
import java.util.Optional;

@Service
public class StoreService {
    
    @Autowired
    private StoreRepository storeRepository;
    
    @Autowired
    private UserStoreMapRepository userStoreMapRepository;

    @Autowired
    private SequenceGeneratorService sequenceGeneratorService;

    @Autowired
    private DSRService dsrService;

    @Autowired
    private TranHeadRepository tranHeadRepository;

    @Autowired
    private PurHeadRepository purHeadRepository;

    @Autowired
    private StoHeadRepository stoHeadRepository;
    
    // Create a new store
    public Store createStore(Store store) {
        // Auto-generate store code if not provided or to ensure format
        if (store.getStoreCode() == null || store.getStoreCode().trim().isEmpty()) {
             store.setStoreCode(sequenceGeneratorService.generateSequence("Master_SEQ"));
        }
        
        // Check if store code already exists
        if (storeRepository.existsByStoreCode(store.getStoreCode())) {
            throw new RuntimeException("Store code already exists: " + store.getStoreCode());
        }
        
        // Set default values
        if (store.getStatus() == null) {
            store.setStatus(true);
        }
        store.setCreatedAt(LocalDateTime.now());
        store.setUpdateAt(LocalDateTime.now());
        
        return storeRepository.save(store);
    }
    
    // Get all stores
    public List<Store> getAllStores() {
        return storeRepository.findAll();
    }
    
    // Get store by ID
    public Optional<Store> getStoreById(Integer id) {
        return storeRepository.findById(id);
    }
    
    // Get store by store code
    public Optional<Store> getStoreByCode(String storeCode) {
        return storeRepository.findByStoreCode(storeCode);
    }
    
    // Get stores by status
    public List<Store> getStoresByStatus(Boolean status) {
        return storeRepository.findByStatus(status);
    }
    
    // Get active stores
    public List<Store> getActiveStores() {
        return storeRepository.findActiveStores();
    }
    
    // Get stores by city
    public List<Store> getStoresByCity(String city) {
        return storeRepository.findByCity(city);
    }
    
    // Get stores by zone
    public List<Store> getStoresByZone(String zone) {
        return storeRepository.findByZone(zone);
    }
    
    // Get stores by district
    public List<Store> getStoresByDistrict(String district) {
        return storeRepository.findByDistrict(district);
    }
    
    // Get stores by area
    public List<Store> getStoresByArea(String area) {
        return storeRepository.findByArea(area);
    }
    
    // Search stores by name
    public List<Store> searchStoresByName(String storeName) {
        return storeRepository.findByStoreNameContainingIgnoreCase(storeName);
    }
    
    // Get stores by multiple criteria
    public List<Store> getStoresByCriteria(String city, String zone, String district, Boolean status) {
        Store probe = new Store();
        if (city != null) probe.setCity(city);
        if (zone != null) probe.setZone(zone);
        if (district != null) probe.setDistrict(district);
        if (status != null) probe.setStatus(status);
        
        ExampleMatcher matcher = ExampleMatcher.matching()
            .withIgnoreNullValues()
            .withStringMatcher(ExampleMatcher.StringMatcher.CONTAINING)
            .withIgnoreCase();
            
        return storeRepository.findAll(Example.of(probe, matcher));
    }
    
    // Update store
    public Store updateStore(Integer id, Store storeDetails) {
        System.out.println("StoreService.updateStore start. ID: " + id);
        Optional<Store> optionalStore = storeRepository.findById(id);
        if (optionalStore.isPresent()) {
            Store existingStore = optionalStore.get();
            
            // Check if store code is being changed and if it already exists
            if (!existingStore.getStoreCode().equals(storeDetails.getStoreCode()) &&
                storeRepository.existsByStoreCode(storeDetails.getStoreCode())) {
                throw new RuntimeException("Store code already exists: " + storeDetails.getStoreCode());
            }
            
            // Update fields
            existingStore.setStoreCode(storeDetails.getStoreCode());
            existingStore.setStoreName(storeDetails.getStoreName());
            existingStore.setAddress(storeDetails.getAddress());
            existingStore.setArea(storeDetails.getArea());
            existingStore.setZone(storeDetails.getZone());
            existingStore.setDistrict(storeDetails.getDistrict());
            existingStore.setCity(storeDetails.getCity());
            existingStore.setPin(storeDetails.getPin());
            existingStore.setPhone(storeDetails.getPhone());
            existingStore.setEmail(storeDetails.getEmail());
            existingStore.setGstNumber(storeDetails.getGstNumber());
            existingStore.setVatNo(storeDetails.getVatNo());
            existingStore.setPanNo(storeDetails.getPanNo());
            existingStore.setState(storeDetails.getState());
            existingStore.setStoreType(storeDetails.getStoreType());
             existingStore.setSaleLed(storeDetails.getSaleLed());
             existingStore.setPartyLed(storeDetails.getPartyLed());
             existingStore.setStatus(storeDetails.getStatus());
            existingStore.setInfo1(storeDetails.getInfo1());
            existingStore.setInfo2(storeDetails.getInfo2());
            existingStore.setInfo3(storeDetails.getInfo3());

            // Check if store is being opened (OpenStatus changing to true)
            Boolean wasOpen = existingStore.getOpenStatus();
            Boolean isOpening = storeDetails.getOpenStatus();
            
            System.out.println("Store Update - ID: " + id);
            System.out.println("Was Open: " + wasOpen);
            System.out.println("Is Opening: " + isOpening);
            System.out.println("Business Date: " + storeDetails.getBusinessDate());
            System.out.println("User Name: " + storeDetails.getCurrentUserName());

            if (Boolean.TRUE.equals(isOpening) && (wasOpen == null || !wasOpen)) {
                if (storeDetails.getBusinessDate() != null) {
                     System.out.println("Calling populateDSR...");
                     dsrService.populateDSR(existingStore.getStoreCode(), storeDetails.getBusinessDate(), storeDetails.getCurrentUserName());
                }
            }

            existingStore.setOpenStatus(storeDetails.getOpenStatus());
            existingStore.setBusinessDate(storeDetails.getBusinessDate());
            existingStore.setUpdateAt(LocalDateTime.now());
            
            return storeRepository.save(existingStore);
        } else {
            throw new RuntimeException("Store not found with id: " + id);
        }
    }
    
    // Delete store
    public void deleteStore(Integer id) {
        Optional<Store> optionalStore = storeRepository.findById(id);
        if (optionalStore.isPresent()) {
            Store store = optionalStore.get();
            String storeCode = store.getStoreCode();
            
            // Check if used in Tran_Head, Pur_Head, or STO_Head
            boolean isUsed = false;
            
            if (!purHeadRepository.findByStoreCode(storeCode).isEmpty()) {
                isUsed = true;
            } else if (stoHeadRepository.existsByFromStoreOrToStore(storeCode, storeCode)) {
                isUsed = true; 
            } else if (tranHeadRepository.existsByStoreCode(storeCode)) {
                isUsed = true;
            }
            
            if (isUsed) {
                // Soft delete
                store.setStatus(false);
                store.setUpdateAt(LocalDateTime.now());
                storeRepository.save(store);
            } else {
                // Hard delete
                try {
                    storeRepository.deleteById(id);
                } catch (Exception e) {
                    // Fallback to soft delete
                    store.setStatus(false);
                    store.setUpdateAt(LocalDateTime.now());
                    storeRepository.save(store);
                }
            }
        } else {
            throw new RuntimeException("Store not found with id: " + id);
        }
    }
    
    // Deactivate store (soft delete)
    public Store deactivateStore(Integer id) {
        Optional<Store> optionalStore = storeRepository.findById(id);
        if (optionalStore.isPresent()) {
            Store store = optionalStore.get();
            store.setStatus(false);
            store.setUpdateAt(LocalDateTime.now());
            return storeRepository.save(store);
        } else {
            throw new RuntimeException("Store not found with id: " + id);
        }
    }
    
    // Activate store
    public Store activateStore(Integer id) {
        Optional<Store> optionalStore = storeRepository.findById(id);
        if (optionalStore.isPresent()) {
            Store store = optionalStore.get();
            store.setStatus(true);
            store.setUpdateAt(LocalDateTime.now());
            return storeRepository.save(store);
        } else {
            throw new RuntimeException("Store not found with id: " + id);
        }
    }
    
    // Check if store code exists
    public boolean storeCodeExists(String storeCode) {
        return storeRepository.existsByStoreCode(storeCode);
    }
    
    // Count stores by status
    public long countStoresByStatus(Boolean status) {
        return storeRepository.countByStatus(status);
    }
    
    // Count active stores
    public long countActiveStores() {
        return storeRepository.countActiveStores();
    }
    
    // Get total store count
    public long getTotalStoreCount() {
        return storeRepository.count();
    }

    // Get stores by username
    public List<Store> getStoresByUserName(String userName) {
        List<UserStoreMap> userStoreMaps = userStoreMapRepository.findByUserName(userName);
        if (userStoreMaps == null || userStoreMaps.isEmpty()) {
            return new ArrayList<>();
        }
        
        List<String> storeCodes = userStoreMaps.stream()
                .map(UserStoreMap::getStoreCode)
                .collect(Collectors.toList());
                
        if (storeCodes.isEmpty()) {
            return new ArrayList<>();
        }
        
        return storeRepository.findByStoreCodeIn(storeCodes);
    }
}
