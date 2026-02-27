"""
Shared logging helper for backend modules.
Keeps logging consistent and lightweight.
"""

import logging


def get_logger(name):
    return logging.getLogger(name)
