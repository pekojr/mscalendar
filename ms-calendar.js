const ATTRIBUTE_DATAS = 'datas';
const ATTRIBUTE_FETCH = 'fetch';

class MsCalendar extends HTMLElement {
    static get observedAttributes() {
        return [ATTRIBUTE_DATAS];
    }

    constructor() {
        super();
        this.initializeVariables();
        this.fetchTemplateAndSetup();
    }     

    // Initialization
    initializeVariables() {   
        this.templatePath = new URL('ms-calendar.html', import.meta.url).href;
        this.cssPath = new URL('ms-calendar.css', import.meta.url).href;

        this.selectedDates = [];
        this.firstDate = new Date();
        this.shadow = this.attachShadow({ mode: 'open' });
        const today = this.firstDate;
        this.currentMonth = today.getMonth();
        this.currentYear = today.getFullYear();
    }

    fetchTemplateAndSetup() {
        fetch(this.templatePath)
            .then(stream => stream.text())
            .then((html) => {
                this.setupShadowRoot(html);
                this.calendario();
                // Exiba o mês atual
                this.updateHeader();
                this.updateSelectedDates();
            });
    }

    setupShadowRoot(html) {
        this.html = html;
        this.shadow.innerHTML = `
            <style>
            @import url('${this.cssPath}');
            </style>
        ` + this.html;
    }

    calendario() {
        // Botões para avançar e retroceder meses
        this.shadow.addEventListener('click', event => {
            if (event.target.matches('#prev-month')) {
                this.prevMonth();
            } else if (event.target.matches('#next-month')) {
                this.nextMonth();
            } else if (event.target.matches('#select')) {
                this.selectDate();
            }
        });
    }

    prevMonth() {
        this.currentMonth--;
        if (this.currentMonth < 0) {
            this.currentMonth = 11;
            this.currentYear--;
        }
        this.updateHeader();
        this.updateSelectedDates();
    }

    nextMonth() {
        this.currentMonth++;
        if (this.currentMonth > 11) {
            this.currentMonth = 0;
            this.currentYear++;
        }
        this.updateHeader();
        this.updateSelectedDates();
    }

    selectDate() {
        this.updateAttributeDatas();
        this.postData();
    }

    updateAttributeDatas() {
        const datas = this.getDatas();
        if (this.getAttribute(ATTRIBUTE_DATAS) !== datas) {
            this.setAttribute(ATTRIBUTE_DATAS, datas);
        }
    }

    postData() {
        const fetchUrl = this.getAttribute(ATTRIBUTE_FETCH);
        if (fetchUrl !== null) {
            this.postDataToUrl(fetchUrl);
        }
    }
    
    async postDataToUrl(url) {
        this.showLoadingIndicator();
        try {
            const token = urlParams.get('access_token');
            const response = await fetch(url, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`
                },
                body: JSON.stringify({
                    datas: this.getDatas(),
                    uuid: this.getAttribute('uuid'),
                    mes_envio: this.getAttribute('mes-envio')
                })
            });
            const data = await response.json();
            // Evento disparado no encerramento da escolha das datas
            const event = new CustomEvent('fetchCompleted', {
                detail: {
                    'data': data
                }
            });

            this.dispatchEvent(event);

            console.log('Success:', data);
            this.showToast('Datas atualizadas com sucesso!');
        } catch (error) {
            console.error('Error:', error);
            const errorMessage = this.formatErrorMessage(error);            
            this.showToast(errorMessage);
        } finally {
            this.hideLoadingIndicator();
        }
    }

    getDatas() {
        return this.selectedDates;
    }

    setAttributeDatas(datas) {
        this.setAttribute("datas", datas);
    }

    pushData(data) {
        this.selectedDates.push(data);
    }

    attributeChangedCallback(name, oldValue, newValue) {
        if (name === ATTRIBUTE_DATAS) {
            this.updateSelectedDatesCal(newValue);
        }
    }

    updateSelectedDatesCal(newValue) {
        if (this.hasAttribute(ATTRIBUTE_DATAS)) {
            this.selectedDates = newValue.split(',');
            this.firstDate = new Date(this.selectedDates[0]);
        } else {
            this.selectedDates = [];
        }
    }

    // Função para atualizar a exibição das datas selecionadas
    updateSelectedDates = () => {
        const calendarDiv = this.shadow.getElementById('calendar');
        if (calendarDiv) {
            calendarDiv.innerHTML = '';

            // Crie células para cada dia do mês
            const firstDayOfMonth = new Date(this.currentYear, this.currentMonth, 1).getDay();
            const lastDay = new Date(this.currentYear, this.currentMonth + 1, 0).getDate();
    
            // Dias da semana em português
            const diasDaSemana = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb'];
    
            // Adicione células para os dias da semana
            diasDaSemana.forEach(dia => {
                const weekCell = document.createElement('div');
                weekCell.classList.add('date-cell');
                weekCell.innerHTML = dia;
                calendarDiv.appendChild(weekCell);
            });
    
            // Preencha os espaços vazios no início do mês
            for (let i = 0; i < firstDayOfMonth; i++) {
                const emptyCell = document.createElement('div');
                emptyCell.classList.add('date-cell');
                calendarDiv.appendChild(emptyCell);
            }
    
            // Crie células para cada dia do mês
            for (let day = 1; day <= lastDay; day++) {
                const dateCell = this.createDateCell(day, firstDayOfMonth);
                calendarDiv.appendChild(dateCell);
            }
        }
    };

    createDateCell = (day, firstDayOfMonth) => {
        const dateCell = document.createElement('div');
        dateCell.classList.add('date-cell');
        dateCell.textContent = day;

        // Verifique se a data está selecionada
        const dateStr = `${this.currentYear}-${this.currentMonth + 1}-${day}`;
        if (this.selectedDates.includes(dateStr)) {
            dateCell.classList.add('selected');
        }

        // Adicione um evento de clique para selecionar/deselecionar datas
        dateCell.addEventListener('click', () => {
            this.toggleDateSelection(dateStr);
        });

        return dateCell;
    };

    toggleDateSelection = (dateStr) => {
        if (this.selectedDates.includes(dateStr)) {
            // Remova a data da lista de seleção
            const index = this.selectedDates.indexOf(dateStr);
            this.selectedDates.splice(index, 1);
        } else {
            // Adicione a data à lista de seleção
            this.pushData(dateStr);
        }

        // Atualize a exibição das datas selecionadas
        this.updateSelectedDates();
    };

    // Exiba o cabeçalho com o mês e ano
    updateHeader = () => {
        const headerDiv = this.shadow.getElementById('month-year');
        const months = ['Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho', 'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro'];
        headerDiv.textContent = `${months[this.currentMonth]} ${this.currentYear}`;
    };

    showToast(message) {
        const toast = document.createElement('toast-notification');
        toast.textContent = message;
        document.body.appendChild(toast);
    }

    formatErrorMessage(error) {
        if (error instanceof TypeError) {
            return 'Ocorreu um erro de tipo. Por favor, verifique seus dados.';
        } else if (error instanceof RangeError) {
            return 'Ocorreu um erro de intervalo. Por favor, verifique seus dados.';
        } else if (error instanceof SyntaxError) {
            return 'Ocorreu um erro de sintaxe. Por favor, verifique seu código.';
        } else {
            return 'Ocorreu um erro desconhecido. Por favor, tente novamente.';
        }
    }

    showLoadingIndicator() {
        const loadingIndicator = document.createElement('div');
        loadingIndicator.id = 'loading-indicator';
        loadingIndicator.textContent = 'Carregando...'; // Ou adicione um spinner aqui
        this.shadow.appendChild(loadingIndicator);
    }
    
    hideLoadingIndicator() {
        const loadingIndicator = this.shadow.getElementById('loading-indicator');
        if (loadingIndicator) {
            this.shadow.removeChild(loadingIndicator);
        }
    }
}
export default MsCalendar;