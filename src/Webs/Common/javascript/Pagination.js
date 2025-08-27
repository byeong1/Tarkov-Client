// =========================
// 페이지네이션 클래스
// =========================
class Pagination {
    constructor(totalItems = 0, itemsPerPage = 10) {
        this.totalItems = totalItems;
        this.itemsPerPage = itemsPerPage;
        this.currentPage = 1;
        this.totalPages = Math.ceil(totalItems / itemsPerPage) || 1;
    }
    
    // 전체 아이템 수 업데이트
    updateTotalItems(totalItems) {
        this.totalItems = totalItems;
        this.totalPages = Math.ceil(totalItems / this.itemsPerPage) || 1;
        
        // 현재 페이지가 전체 페이지를 초과하면 마지막 페이지로 이동
        if (this.currentPage > this.totalPages) {
            this.currentPage = this.totalPages;
        }
    }
    
    // 특정 페이지로 이동
    goToPage(pageNumber) {
        const newPage = Math.max(1, Math.min(pageNumber, this.totalPages));
        if (newPage !== this.currentPage) {
            this.currentPage = newPage;
            return true; // 페이지가 변경됨
        }
        return false; // 페이지 변경 없음
    }
    
    // 이전 페이지로 이동
    goToPrevPage() {
        return this.goToPage(this.currentPage - 1);
    }
    
    // 다음 페이지로 이동
    goToNextPage() {
        return this.goToPage(this.currentPage + 1);
    }
    
    // 현재 페이지의 아이템들 추출
    getCurrentPageItems(allItems) {
        const startIndex = (this.currentPage - 1) * this.itemsPerPage;
        const endIndex = startIndex + this.itemsPerPage;
        return allItems.slice(startIndex, endIndex);
    }
    
    // 페이지 정보 반환
    getPageInfo() {
        const startIndex = (this.currentPage - 1) * this.itemsPerPage + 1;
        const endIndex = Math.min(startIndex + this.itemsPerPage - 1, this.totalItems);
        
        return {
            currentPage: this.currentPage,
            totalPages: this.totalPages,
            startIndex: startIndex,
            endIndex: endIndex,
            totalItems: this.totalItems,
            hasNext: this.currentPage < this.totalPages,
            hasPrev: this.currentPage > 1
        };
    }
    
    // 표시할 페이지 번호 배열 생성 (스마트 페이지네이션)
    getPageNumbers() {
        const pages = [];
        const current = this.currentPage;
        const total = this.totalPages;
        
        if (total <= 7) {
            // 전체 페이지가 7개 이하면 모두 표시
            for (let i = 1; i <= total; i++) {
                pages.push(i);
            }
        } else {
            // 복잡한 로직: [1] [2] ... [current-1] [current] [current+1] ... [total-1] [total]
            pages.push(1);
            
            if (current > 4) {
                pages.push('...');
            }
            
            const start = Math.max(2, current - 1);
            const end = Math.min(total - 1, current + 1);
            
            for (let i = start; i <= end; i++) {
                if (i !== 1 && i !== total) {
                    pages.push(i);
                }
            }
            
            if (current < total - 3) {
                pages.push('...');
            }
            
            if (total > 1) {
                pages.push(total);
            }
        }
        
        return pages;
    }
}

// 모듈 export (다른 파일에서 사용할 수 있도록)
window.Pagination = Pagination;