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
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;
import java.util.Objects;
import java.util.List;
import java.util.Optional;
import java.util.Set;
import java.util.LinkedHashSet;

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

            boolean changed = false;

            if (storeDetails.getStoreCode() != null && !existingStore.getStoreCode().equals(storeDetails.getStoreCode())) {
                if (storeRepository.existsByStoreCode(storeDetails.getStoreCode())) {
                    throw new RuntimeException("Store code already exists: " + storeDetails.getStoreCode());
                }
                existingStore.setStoreCode(storeDetails.getStoreCode());
                changed = true;
            }

            if (storeDetails.getStoreName() != null && !Objects.equals(existingStore.getStoreName(), storeDetails.getStoreName())) {
                existingStore.setStoreName(storeDetails.getStoreName());
                changed = true;
            }
            if (storeDetails.getAddress() != null && !Objects.equals(existingStore.getAddress(), storeDetails.getAddress())) {
                existingStore.setAddress(storeDetails.getAddress());
                changed = true;
            }
            if (storeDetails.getArea() != null && !Objects.equals(existingStore.getArea(), storeDetails.getArea())) {
                existingStore.setArea(storeDetails.getArea());
                changed = true;
            }
            if (storeDetails.getZone() != null && !Objects.equals(existingStore.getZone(), storeDetails.getZone())) {
                existingStore.setZone(storeDetails.getZone());
                changed = true;
            }
            if (storeDetails.getDistrict() != null && !Objects.equals(existingStore.getDistrict(), storeDetails.getDistrict())) {
                existingStore.setDistrict(storeDetails.getDistrict());
                changed = true;
            }
            if (storeDetails.getCity() != null && !Objects.equals(existingStore.getCity(), storeDetails.getCity())) {
                existingStore.setCity(storeDetails.getCity());
                changed = true;
            }
            if (storeDetails.getPin() != null && !Objects.equals(existingStore.getPin(), storeDetails.getPin())) {
                existingStore.setPin(storeDetails.getPin());
                changed = true;
            }
            if (storeDetails.getPhone() != null && !Objects.equals(existingStore.getPhone(), storeDetails.getPhone())) {
                existingStore.setPhone(storeDetails.getPhone());
                changed = true;
            }
            if (storeDetails.getEmail() != null && !Objects.equals(existingStore.getEmail(), storeDetails.getEmail())) {
                existingStore.setEmail(storeDetails.getEmail());
                changed = true;
            }
            if (storeDetails.getGstNumber() != null && !Objects.equals(existingStore.getGstNumber(), storeDetails.getGstNumber())) {
                existingStore.setGstNumber(storeDetails.getGstNumber());
                changed = true;
            }
            if (storeDetails.getVatNo() != null && !Objects.equals(existingStore.getVatNo(), storeDetails.getVatNo())) {
                existingStore.setVatNo(storeDetails.getVatNo());
                changed = true;
            }
            if (storeDetails.getPanNo() != null && !Objects.equals(existingStore.getPanNo(), storeDetails.getPanNo())) {
                existingStore.setPanNo(storeDetails.getPanNo());
                changed = true;
            }
            if (storeDetails.getState() != null && !Objects.equals(existingStore.getState(), storeDetails.getState())) {
                existingStore.setState(storeDetails.getState());
                changed = true;
            }
            if (storeDetails.getStoreType() != null && !Objects.equals(existingStore.getStoreType(), storeDetails.getStoreType())) {
                existingStore.setStoreType(storeDetails.getStoreType());
                changed = true;
            }
            if (storeDetails.getSaleLed() != null && !Objects.equals(existingStore.getSaleLed(), storeDetails.getSaleLed())) {
                existingStore.setSaleLed(storeDetails.getSaleLed());
                changed = true;
            }
            if (storeDetails.getPartyLed() != null && !Objects.equals(existingStore.getPartyLed(), storeDetails.getPartyLed())) {
                existingStore.setPartyLed(storeDetails.getPartyLed());
                changed = true;
            }
            if (storeDetails.getStatus() != null && !Objects.equals(existingStore.getStatus(), storeDetails.getStatus())) {
                existingStore.setStatus(storeDetails.getStatus());
                changed = true;
            }
            if (storeDetails.getIsDsrDisabled() != null && !Objects.equals(existingStore.getIsDsrDisabled(), storeDetails.getIsDsrDisabled())) {
                existingStore.setIsDsrDisabled(storeDetails.getIsDsrDisabled());
                changed = true;
            }
            if (storeDetails.getInfo1() != null && !Objects.equals(existingStore.getInfo1(), storeDetails.getInfo1())) {
                existingStore.setInfo1(storeDetails.getInfo1());
                changed = true;
            }
            if (storeDetails.getInfo2() != null && !Objects.equals(existingStore.getInfo2(), storeDetails.getInfo2())) {
                existingStore.setInfo2(storeDetails.getInfo2());
                changed = true;
            }
            if (storeDetails.getInfo3() != null && !Objects.equals(existingStore.getInfo3(), storeDetails.getInfo3())) {
                existingStore.setInfo3(storeDetails.getInfo3());
                changed = true;
            }

            if (!changed) {
                return existingStore;
            }

            existingStore.setUpdateAt(LocalDateTime.now());
            return storeRepository.save(existingStore);
        } else {
            throw new RuntimeException("Store not found with id: " + id);
        }
    }

    public Store openStore(Integer id, String businessDate, String currentUserName) {
        Optional<Store> optionalStore = storeRepository.findById(id);
        if (optionalStore.isEmpty()) {
            throw new RuntimeException("Store not found with id: " + id);
        }

        Store existingStore = optionalStore.get();
        Boolean wasOpen = existingStore.getOpenStatus();

        if (Boolean.TRUE.equals(wasOpen)) {
            return existingStore;
        }

        if (businessDate == null || businessDate.isBlank()) {
            throw new RuntimeException("businessDate is required");
        }

        System.out.println("Store Open - ID: " + id);
        System.out.println("Was Open: " + wasOpen);
        System.out.println("Business Date: " + businessDate);
        System.out.println("User Name: " + currentUserName);
        System.out.println("Calling populateDSR...");
        dsrService.populateDSR(existingStore.getStoreCode(), businessDate, currentUserName);

        existingStore.setOpenStatus(true);
        existingStore.setBusinessDate(businessDate);
        existingStore.setUpdateAt(LocalDateTime.now());
        return storeRepository.save(existingStore);
    }

    public Store closeStore(Integer id) {
        Optional<Store> optionalStore = storeRepository.findById(id);
        if (optionalStore.isEmpty()) {
            throw new RuntimeException("Store not found with id: " + id);
        }

        Store existingStore = optionalStore.get();
        if (!Boolean.TRUE.equals(existingStore.getOpenStatus())) {
            return existingStore;
        }

        existingStore.setOpenStatus(false);
        existingStore.setUpdateAt(LocalDateTime.now());
        return storeRepository.save(existingStore);
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
        
        return storeRepository.findByStoreCodeInAndStatus(storeCodes, true);
    }

    @Transactional
    public List<String> replaceUserStores(String userName, List<String> incomingStoreCodes) {
        if (userName == null || userName.isBlank()) {
            throw new RuntimeException("userName is required");
        }

        List<String> incoming = incomingStoreCodes != null ? incomingStoreCodes : java.util.Collections.emptyList();
        Set<String> codes = new LinkedHashSet<>();
        for (String c : incoming) {
            if (c != null && !c.isBlank()) {
                codes.add(c.trim());
            }
        }

        userStoreMapRepository.deleteAllByUserName(userName);

        if (codes.isEmpty()) {
            return java.util.Collections.emptyList();
        }

        for (String code : codes) {
            Optional<Store> storeOpt = getStoreByCode(code);
            if (storeOpt.isEmpty()) {
                throw new RuntimeException("Store code not found: " + code);
            }
            if (!Boolean.TRUE.equals(storeOpt.get().getStatus())) {
                throw new RuntimeException("Store is inactive: " + code);
            }
        }

        List<UserStoreMap> mappings = new ArrayList<>();
        for (String code : codes) {
            mappings.add(new UserStoreMap(userName, code));
        }
        userStoreMapRepository.saveAll(mappings);
        return new ArrayList<>(codes);
    }
}
