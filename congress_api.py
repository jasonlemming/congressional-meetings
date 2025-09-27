"""Thin Congress.gov API client wrappers used by the exporter."""

from __future__ import annotations

import logging
from typing import Dict, Generator, Iterable, Optional

import requests
from requests import Response, Session
from tenacity import retry, retry_if_exception_type, stop_after_attempt, wait_exponential_jitter

from rate_limit import Throttler

LOGGER = logging.getLogger(__name__)


class CongressAPIError(RuntimeError):
    """Raised when the Congress.gov API returns an unexpected response."""


class CongressAPI:
    """Lightweight helper around the Congress.gov v3 API."""

    def __init__(
        self,
        api_key: str,
        *,
        base_url: str = "https://api.congress.gov/v3",
        session: Optional[Session] = None,
        throttler: Optional[Throttler] = None,
    ) -> None:
        self.api_key = api_key
        self.base_url = base_url.rstrip("/")
        self.session = session or requests.Session()
        self.throttler = throttler or Throttler(1.0)

    def iter_committees(
        self,
        *,
        congress: int = 119,
        chamber: Optional[str] = None,
    ) -> Generator[Dict, None, None]:
        """Yield committee items for the provided congress/chamber."""

        params = {"congress": congress}
        if chamber and chamber.lower() != "all":
            params["chamber"] = chamber.lower()

        yield from self._paginate("committee", params=params)

    def iter_committee_meetings(
        self,
        *,
        congress: int = 119,
        chamber: Optional[str] = None,
        meeting_type: Optional[str] = None,
    ) -> Generator[Dict, None, None]:
        params = {"congress": congress}
        if chamber and chamber.lower() != "all":
            params["chamber"] = chamber.lower()
        if meeting_type and meeting_type.lower() != "all":
            params["meetingType"] = meeting_type.lower()

        yield from self._paginate("committee-meeting", params=params)

    def get_committee_meeting_detail(
        self, *, congress: int, chamber: str, event_id: str
    ) -> Dict:
        path = f"committee-meeting/{congress}/{chamber}/{event_id}"
        data = self._get(path)
        if "committeeMeeting" not in data:
            raise CongressAPIError("Missing committeeMeeting in response")
        return data["committeeMeeting"]

    def iter_hearings(
        self,
        *,
        congress: int = 119,
        chamber: Optional[str] = None,
        committee_system_code: Optional[str] = None,
    ) -> Generator[Dict, None, None]:
        params = {"congress": congress}
        if chamber and chamber.lower() != "all":
            params["chamber"] = chamber.lower()
        if committee_system_code:
            params["systemCode"] = committee_system_code

        yield from self._paginate("committee-hearing", params=params)

    # ------------------------------------------------------------------
    def _paginate(self, path: str, *, params: Optional[Dict] = None) -> Generator[Dict, None, None]:
        limit = 250
        offset = 0
        while True:
            page_params = dict(params or {})
            page_params.update({"limit": limit, "offset": offset})
            data = self._get(path, params=page_params)
            collection = data.get(path.replace("-", "") + "s") or data.get("items")
            if collection is None:
                raise CongressAPIError(f"Unexpected response structure for {path}")

            items = collection.get("item") if isinstance(collection, dict) else collection
            if not items:
                return

            if isinstance(items, dict):
                items = [items]

            for item in items:
                yield item

            next_page = collection.get("next") if isinstance(collection, dict) else None
            if not next_page:
                return
            offset += limit

    @retry(
        retry=retry_if_exception_type((requests.RequestException, CongressAPIError)),
        wait=wait_exponential_jitter(initial=1, max=30),
        stop=stop_after_attempt(5),
        reraise=True,
    )
    def _get(self, path: str, params: Optional[Dict] = None) -> Dict:
        query = dict(params or {})
        query.update({"api_key": self.api_key, "format": "json"})
        url = f"{self.base_url}/{path}"
        self.throttler.wait()
        LOGGER.debug("GET %s params=%s", url, query)
        response = self.session.get(url, params=query, timeout=30)
        self._check_response(response)
        return response.json()

    @staticmethod
    def _check_response(response: Response) -> None:
        if response.status_code >= 400:
            LOGGER.warning("Congress.gov API error %s: %s", response.status_code, response.text)
            response.raise_for_status()


__all__ = ["CongressAPI", "CongressAPIError"]

