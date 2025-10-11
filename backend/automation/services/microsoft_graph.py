"""
Microsoft Graph API Client para leer emails desde Office 365/Outlook.

Requiere:
- Azure App Registration con permisos Mail.Read
- Variables de entorno: MS_GRAPH_CLIENT_ID, MS_GRAPH_CLIENT_SECRET, MS_GRAPH_TENANT_ID
"""

import os
import logging
from typing import List, Dict, Optional
from datetime import datetime, timedelta
import requests
from django.conf import settings

logger = logging.getLogger(__name__)


class MicrosoftGraphClient:
    """
    Cliente para interactuar con Microsoft Graph API.
    Maneja autenticación OAuth2 y lectura de emails.
    """
    
    GRAPH_API_ENDPOINT = "https://graph.microsoft.com/v1.0"
    TOKEN_ENDPOINT = "https://login.microsoftonline.com/{tenant_id}/oauth2/v2.0/token"
    
    def __init__(
        self,
        client_id: Optional[str] = None,
        client_secret: Optional[str] = None,
        tenant_id: Optional[str] = None,
        user_email: Optional[str] = None,
    ):
        """
        Initialize Microsoft Graph client.
        
        Args:
            client_id: Azure App Client ID (default: from settings/env)
            client_secret: Azure App Client Secret (default: from settings/env)
            tenant_id: Azure Tenant ID (default: from settings/env)
            user_email: Email del usuario a monitorear (default: from settings/env)
        """
        self.client_id = client_id or getattr(settings, 'MS_GRAPH_CLIENT_ID', os.getenv('MS_GRAPH_CLIENT_ID'))
        self.client_secret = client_secret or getattr(settings, 'MS_GRAPH_CLIENT_SECRET', os.getenv('MS_GRAPH_CLIENT_SECRET'))
        self.tenant_id = tenant_id or getattr(settings, 'MS_GRAPH_TENANT_ID', os.getenv('MS_GRAPH_TENANT_ID'))
        self.user_email = user_email or getattr(settings, 'MS_GRAPH_USER_EMAIL', os.getenv('MS_GRAPH_USER_EMAIL'))
        
        self.access_token = None
        self.token_expires_at = None
        
        if not all([self.client_id, self.client_secret, self.tenant_id, self.user_email]):
            raise ValueError(
                "Microsoft Graph credentials not configured. "
                "Set MS_GRAPH_CLIENT_ID, MS_GRAPH_CLIENT_SECRET, MS_GRAPH_TENANT_ID, MS_GRAPH_USER_EMAIL"
            )
    
    def _get_access_token(self) -> str:
        """
        Obtiene access token usando Client Credentials Flow.
        Cachea el token hasta que expire.
        """
        # Si hay token válido, retornarlo
        if self.access_token and self.token_expires_at:
            if datetime.now() < self.token_expires_at - timedelta(minutes=5):
                return self.access_token
        
        # Solicitar nuevo token
        token_url = self.TOKEN_ENDPOINT.format(tenant_id=self.tenant_id)
        
        data = {
            'client_id': self.client_id,
            'client_secret': self.client_secret,
            'scope': 'https://graph.microsoft.com/.default',
            'grant_type': 'client_credentials'
        }
        
        try:
            response = requests.post(token_url, data=data, timeout=30)
            response.raise_for_status()
            
            token_data = response.json()
            self.access_token = token_data['access_token']
            expires_in = token_data.get('expires_in', 3600)
            self.token_expires_at = datetime.now() + timedelta(seconds=expires_in)
            
            logger.info("Successfully obtained MS Graph access token")
            return self.access_token
            
        except requests.exceptions.RequestException as e:
            logger.error(f"Failed to obtain MS Graph access token: {e}")
            raise
    
    def _make_request(self, method: str, endpoint: str, **kwargs) -> Dict:
        """
        Hace request a MS Graph API con autenticación.
        
        Args:
            method: HTTP method (GET, POST, etc)
            endpoint: API endpoint (sin base URL)
            **kwargs: Argumentos adicionales para requests
        
        Returns:
            JSON response como dict
        """
        token = self._get_access_token()
        
        headers = kwargs.pop('headers', {})
        headers['Authorization'] = f'Bearer {token}'
        headers['Content-Type'] = 'application/json'
        
        url = f"{self.GRAPH_API_ENDPOINT}{endpoint}"
        
        try:
            response = requests.request(method, url, headers=headers, timeout=60, **kwargs)
            response.raise_for_status()
            return response.json()
            
        except requests.exceptions.RequestException as e:
            logger.error(f"MS Graph API request failed: {method} {endpoint} - {e}")
            raise
    
    def list_messages(
        self,
        folder: str = "Inbox",
        filter_query: Optional[str] = None,
        top: int = 50,
        select: Optional[List[str]] = None,
    ) -> List[Dict]:
        """
        Lista mensajes de una carpeta.
        
        Args:
            folder: Nombre de la carpeta (default: Inbox)
            filter_query: OData filter query (ej: "subject eq 'DTE'")
            top: Cantidad máxima de mensajes (default: 50)
            select: Campos a seleccionar (default: todos)
        
        Returns:
            Lista de mensajes como dicts
        """
        # Construir endpoint
        endpoint = f"/users/{self.user_email}/mailFolders/{folder}/messages"
        
        # Construir query params
        params = {
            '$top': top,
            '$orderby': 'receivedDateTime desc'
        }
        
        if filter_query:
            params['$filter'] = filter_query
        
        if select:
            params['$select'] = ','.join(select)
        
        try:
            response = self._make_request('GET', endpoint, params=params)
            messages = response.get('value', [])
            
            logger.info(f"Retrieved {len(messages)} messages from {folder}")
            return messages
            
        except Exception as e:
            logger.error(f"Failed to list messages: {e}")
            raise
    
    def get_message(self, message_id: str) -> Dict:
        """
        Obtiene un mensaje específico con todos sus detalles.
        
        Args:
            message_id: ID del mensaje
        
        Returns:
            Mensaje como dict
        """
        endpoint = f"/users/{self.user_email}/messages/{message_id}"
        
        try:
            message = self._make_request('GET', endpoint)
            logger.debug(f"Retrieved message: {message_id}")
            return message
            
        except Exception as e:
            logger.error(f"Failed to get message {message_id}: {e}")
            raise
    
    def list_attachments(self, message_id: str) -> List[Dict]:
        """
        Lista los attachments de un mensaje.
        
        Args:
            message_id: ID del mensaje
        
        Returns:
            Lista de attachments como dicts
        """
        endpoint = f"/users/{self.user_email}/messages/{message_id}/attachments"
        
        try:
            response = self._make_request('GET', endpoint)
            attachments = response.get('value', [])
            
            logger.debug(f"Message {message_id} has {len(attachments)} attachments")
            return attachments
            
        except Exception as e:
            logger.error(f"Failed to list attachments for {message_id}: {e}")
            raise
    
    def download_attachment(self, message_id: str, attachment_id: str) -> Dict:
        """
        Descarga un attachment específico.
        
        Args:
            message_id: ID del mensaje
            attachment_id: ID del attachment
        
        Returns:
            Attachment data como dict con 'name', 'contentType', 'contentBytes'
        """
        endpoint = f"/users/{self.user_email}/messages/{message_id}/attachments/{attachment_id}"
        
        try:
            attachment = self._make_request('GET', endpoint)
            logger.debug(f"Downloaded attachment: {attachment.get('name')}")
            return attachment
            
        except Exception as e:
            logger.error(f"Failed to download attachment {attachment_id}: {e}")
            raise
    
    def search_messages_by_subject(
        self,
        keywords: List[str],
        folder: str = "Inbox",
        days_back: int = 7,
        max_results: int = 50,
    ) -> List[Dict]:
        """
        Busca mensajes por palabras clave en el subject.
        
        Args:
            keywords: Lista de palabras clave (OR logic)
            folder: Carpeta donde buscar
            days_back: Días hacia atrás para buscar
            max_results: Máximo de resultados
        
        Returns:
            Lista de mensajes que coinciden
        """
        # Construir filter query
        date_filter = datetime.now() - timedelta(days=days_back)
        date_str = date_filter.strftime('%Y-%m-%dT%H:%M:%SZ')
        
        # Construir OR condition para keywords
        subject_filters = [f"contains(subject, '{kw}')" for kw in keywords]
        subject_query = ' or '.join(subject_filters)
        
        filter_query = f"receivedDateTime ge {date_str} and ({subject_query})"
        
        logger.info(f"Searching messages with filter: {filter_query}")
        
        return self.list_messages(
            folder=folder,
            filter_query=filter_query,
            top=max_results
        )
    
    def mark_as_read(self, message_id: str) -> None:
        """
        Marca un mensaje como leído.
        
        Args:
            message_id: ID del mensaje
        """
        endpoint = f"/users/{self.user_email}/messages/{message_id}"
        
        try:
            self._make_request('PATCH', endpoint, json={'isRead': True})
            logger.debug(f"Marked message {message_id} as read")
            
        except Exception as e:
            logger.error(f"Failed to mark message as read {message_id}: {e}")
            raise
    
    def move_message(self, message_id: str, destination_folder: str) -> None:
        """
        Mueve un mensaje a otra carpeta.
        
        Args:
            message_id: ID del mensaje
            destination_folder: Nombre de la carpeta destino
        """
        endpoint = f"/users/{self.user_email}/messages/{message_id}/move"
        
        try:
            self._make_request('POST', endpoint, json={'destinationId': destination_folder})
            logger.debug(f"Moved message {message_id} to {destination_folder}")
            
        except Exception as e:
            logger.error(f"Failed to move message {message_id}: {e}")
            raise
